import { t, applyI18n, locale, dayName, dayShort, dayOrder } from './i18n.js';

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const hm = (t) => `${pad(t.h)}:${pad(t.m)}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Which timers + settings go in which section
const SECTIONS = [
  { timer: 'filter', title: 'secFilter', icon: 'pump', settings: [], intro: 'introFilter' },
  { timer: 'backwash', title: 'secBackwash', icon: 'wash', settings: ['backwashDuration', 'rinseDuration'], intro: 'introBackwash' },
  { timer: 'eco', title: 'secEco', icon: 'leaf', settings: ['ecoReduction'], intro: 'introEco' },
  { timer: 'aux', title: 'secAux', icon: 'bulb', settings: ['auxTimeLimit'], intro: 'introAux' },
];
const ICONS = {
  pump: '<circle cx="12" cy="12" r="8"/><path d="M12 4v8l5 5"/>',
  wash: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/>',
  leaf: '<path d="M5 19c8 0 14-6 14-14C11 5 5 11 5 19zm0 0 7-7"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
};

const TIMER_TITLE = { filter: 'secFilter', backwash: 'secBackwash', eco: 'secEco', aux: 'secAux' };
let data = null;
let loadedAt = null;
let editing = null; // { kind, slot }

function toast(msg, err = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.className = 'toast' + (err ? ' err' : '')), 3200);
}

async function api(path, body) {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}

// Duration of a slot in minutes (handles crossing midnight)
const minutes = (s) => {
  if (!s.from || !s.to) return 0;
  let d = (s.to.h * 60 + s.to.m) - (s.from.h * 60 + s.from.m);
  if (d <= 0) d += 1440;
  return d;
};
// Union (in minutes) of daily intervals, so overlapping slots aren't counted twice
function dailyCoverage(slots) {
  const iv = [];
  for (const s of slots) {
    if (!s.from || !s.to) continue;
    const a = s.from.h * 60 + s.from.m, b = s.to.h * 60 + s.to.m;
    if (b > a) iv.push([a, b]); else { iv.push([a, 1440]); iv.push([0, b]); }
  }
  iv.sort((x, y) => x[0] - y[0]);
  let total = 0, cur = null;
  for (const [a, b] of iv) {
    if (!cur || a > cur[1]) { if (cur) total += cur[1] - cur[0]; cur = [a, b]; } else cur[1] = Math.max(cur[1], b);
  }
  return total + (cur ? cur[1] - cur[0] : 0);
}
const overlaps = (x, y) => dailyCoverage([x]) + dailyCoverage([y]) > dailyCoverage([x, y]);

const fmtDur = (min) => `${Math.floor(min / 60)} h${min % 60 ? ' ' + pad(min % 60) : ''}`;

function slotLabel(t, s) {
  if (!s.from) return esc(s.text);
  const d1 = dayShort(s.from.day);
  if (!t.hasEnd) return `<b>${d1}</b><span>${hm(s.from)}</span>`;
  const d2 = t.endDay && s.to.day !== s.from.day ? ` ${dayShort(s.to.day)}` : '';
  return `<b>${d1}</b><span>${hm(s.from)} → ${d2 ? d2 + ' ' : ''}${hm(s.to)}</span><em>${fmtDur(minutes(s))}</em>`;
}

function render() {
  const { timers, settings } = data;
  const html = SECTIONS.map((sec) => {
    const tm = timers[sec.timer];
    const used = tm.slots.filter((s) => s.text);
    const next = tm.slots.find((s) => !s.text && s.enabled);
    let summary = '';
    if (sec.timer === 'filter' && used.length) {
      const daily = used.filter((s) => s.from?.day === 7);
      const allDaily = daily.length === used.length;
      const total = dailyCoverage(daily) + used.filter((s) => s.from?.day !== 7).reduce((a, s) => a + minutes(s) / 7, 0);
      summary = `<span class="pill on">${allDaily ? '' : '≈ '}${t('perDay', { d: fmtDur(Math.round(total)) })}</span>`;
    }
    const rows = used.map((s) => `
      <button class="row slot" data-kind="${sec.timer}" data-slot="${s.slot}">
        <span class="slot-n">${s.slot}</span><span class="slot-txt">${slotLabel(tm, s)}</span>
        <svg class="chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
      </button>`).join('');
    const add = next ? `<button class="row add" data-kind="${sec.timer}" data-slot="${next.slot}">${t('addSlot')}</button>` : '';
    const empty = !used.length ? `<p class="empty">${t('noSlots')}</p>` : '';
    const sets = sec.settings.map((k) => {
      const s = settings[k];
      return `<div class="row setting">
        <span>${esc(t(k))}</span>
        <div class="stepper sm" data-key="${k}">
          <button type="button" data-d="-1" aria-label="${t('less')}">−</button>
          <output>${s.value == null ? '—' : s.value.toFixed(s.decimals || 0)}</output><small>${esc(s.unit)}</small>
          <button type="button" data-d="1" aria-label="${t('more')}">+</button>
        </div>
      </div>`;
    }).join('');
    return `
      <h2 class="sec-h"><svg viewBox="0 0 24 24">${ICONS[sec.icon]}</svg>${t(sec.title)}${summary}</h2>
      <section class="card list">
        <p class="intro">${t(sec.intro)}</p>
        ${empty}${rows}${add}${sets}
      </section>`;
  }).join('');
  $('content').innerHTML = html + `<p class="foot">${t('footNote')}</p>`;
  bind();
}

function bind() {
  document.querySelectorAll('.row.slot, .row.add').forEach((el) =>
    el.addEventListener('click', () => openEditor(el.dataset.kind, +el.dataset.slot)));

  // Numeric settings with debounce
  document.querySelectorAll('.stepper[data-key]').forEach((st) => {
    const key = st.dataset.key, s = data.settings[key], out = st.querySelector('output');
    let draft = s.value ?? s.min, timer;
    st.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      draft = Math.min(s.max, Math.max(s.min, Math.round((draft + s.step * +b.dataset.d) * 100) / 100));
      out.textContent = draft.toFixed(s.decimals || 0);
      st.classList.add('pending');
      clearTimeout(timer);
      timer = setTimeout(async () => {
        st.classList.add('busy');
        try { data = await api('api/setting', { key, value: draft }); toast(`${t(key)}: ${draft.toFixed(s.decimals || 0)} ${s.unit}`); render(); }
        catch (e) { toast(e.message, true); load(); }
      }, 1000);
    }));
  });
}

// ---------- Editor ----------
function fillDays(sel, value) {
  sel.innerHTML = dayOrder.map((v) => `<option value="${v}" ${v === value ? 'selected' : ''}>${dayName(v)}</option>`).join('');
}

function openEditor(kind, slot) {
  const tm = data.timers[kind];
  const s = tm.slots.find((x) => x.slot === slot);
  editing = { kind, slot };
  const isNew = !s?.text;
  $('edTitle').textContent = `${t(TIMER_TITLE[kind])} · ${t('slotN', { n: slot })}${isNew ? ' ' + t('newSlot') : ''}`;
  $('edFromLabel').textContent = tm.hasEnd ? t('start') : t('departure');
  fillDays($('edFromDay'), s?.from?.day ?? 7);
  $('edFromTime').value = s?.from ? hm(s.from) : (kind === 'backwash' ? '10:00' : '09:00');
  $('edToWrap').hidden = !tm.hasEnd;
  $('edToDay').hidden = !tm.endDay;
  fillDays($('edToDay'), s?.to?.day ?? s?.from?.day ?? 7);
  $('edToTime').value = s?.to ? hm(s.to) : '17:00';
  $('edToTime').required = !!tm.hasEnd;
  $('edDelete').hidden = isNew;
  $('edDelete').textContent = t('del');
  updateHint();
  $('sheet').hidden = false;
  requestAnimationFrame(() => $('sheet').classList.add('open'));
}

function closeEditor() {
  $('sheet').classList.remove('open');
  setTimeout(() => ($('sheet').hidden = true), 250);
  editing = null;
}

function readTime(v) { const [h, m] = v.split(':').map(Number); return { h, m }; }

function updateHint() {
  if (!editing) return;
  const tm = data.timers[editing.kind];
  if (!tm.hasEnd || !$('edFromTime').value || !$('edToTime').value) return ($('edHint').textContent = ' ');
  const d = minutes({ from: readTime($('edFromTime').value), to: readTime($('edToTime').value) });
  const me = { from: { day: +$('edFromDay').value, ...readTime($('edFromTime').value) }, to: readTime($('edToTime').value) };
  const clash = tm.slots.find((s) => s.slot !== editing.slot && s.from && s.to &&
    (s.from.day === 7 || me.from.day === 7 || s.from.day === me.from.day) && overlaps(s, me));
  $('edHint').textContent = t('durationX', { d: fmtDur(d) }) + (clash ? ' · ' + t('overlapsN', { n: clash.slot }) : '');
}
['edFromTime', 'edToTime', 'edFromDay'].forEach((id) => $(id).addEventListener('input', updateHint));
// Keep end day in sync when start day is "daily"
$('edFromDay').addEventListener('change', () => { if ($('edFromDay').value === '7') $('edToDay').value = '7'; });

$('editor').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { kind, slot } = editing;
  const tm = data.timers[kind];
  const body = { kind, slot, from: { day: +$('edFromDay').value, ...readTime($('edFromTime').value) } };
  if (tm.hasEnd) body.to = { day: tm.endDay ? +$('edToDay').value : body.from.day, ...readTime($('edToTime').value) };
  $('edSave').classList.add('busy');
  try { data = await api('api/timer', body); render(); closeEditor(); toast(t('saved')); }
  catch (err) { toast(err.message, true); }
  finally { $('edSave').classList.remove('busy'); }
});

$('edDelete').addEventListener('click', async () => {
  const b = $('edDelete');
  if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = t('confirmQ'); setTimeout(() => { b.dataset.confirm = ''; b.textContent = t('del'); }, 3000); return; }
  b.dataset.confirm = '';
  const { kind, slot } = editing;
  b.classList.add('busy');
  try { data = await api('api/timer', { kind, slot, clear: true }); render(); closeEditor(); toast(t('deleted')); }
  catch (err) { toast(err.message, true); }
  finally { b.classList.remove('busy'); }
});

document.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeEditor));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && editing) closeEditor(); });

// ---------- Load ----------
async function load() {
  $('reload').classList.add('spin');
  try {
    data = await api('api/advanced');
    render();
    loadedAt = new Date();
    showStatus();
  } catch (e) {
    loadedAt = null;
    $('status').textContent = t('unreachable');
    toast(e.message, true);
  } finally {
    setTimeout(() => $('reload').classList.remove('spin'), 300);
  }
}
function showStatus() {
  if (loadedAt) $('status').textContent = t('readAt', { t: loadedAt.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }) });
}

$('reload').addEventListener('click', load);
applyI18n(() => { document.title = `${t('appTitle')} · ${t('settingsTitle')}`; showStatus(); if (data) render(); });
document.title = `${t('appTitle')} · ${t('settingsTitle')}`;
load();
