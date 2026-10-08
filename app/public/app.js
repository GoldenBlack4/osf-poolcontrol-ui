import { t, ctrlText, applyI18n, locale } from './i18n.js';

const $ = (id) => document.getElementById(id);
const C = 2 * Math.PI * 84; // gauge circumference
const T_MIN = 10, T_MAX = 40;
const fmt = (n) => (n == null ? '--.-' : n.toFixed(1));
const PILL = { on: 'active', off: 'inactive', locked: 'locked' };

let state = null;
let spDraft = null, spTimer = null;

$('arc').style.strokeDasharray = C;
$('arc').style.strokeDashoffset = C;

function toast(msg, err = false) {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.className = 'toast' + (err ? ' err' : '')), 3200);
}

function pill(el, s) {
  el.textContent = PILL[s] ? t(PILL[s]) : '—';
  el.className = 'pill ' + (s || '');
}

function tile(el, on) {
  el.classList.toggle('active', !!on);
  el.querySelector('em').textContent = on == null ? '—' : on ? t('on') : t('off');
}

// Is the filter pump running (manual or by timer)?
const pumpRunning = (s) => s?.status?.icons?.filter === 'on' || s?.settings?.manual?.pump === true ||
  (s?.status?.filterText && !/standby/i.test(s.status.filterText));

function render(s = state) {
  if (!s) return;
  state = s;
  const st = s.status || {}, set = s.settings || {};
  $('dot').className = 'dot ' + (s.online ? 'on' : 'off');
  $('conn').textContent = s.online ? t('connected') : `${t('offline')}${s.error ? ' — ' + s.error : ''}`;

  // Gauge
  const w = st.waterTemp;
  const f = w == null ? 0 : Math.min(1, Math.max(0, (w - T_MIN) / (T_MAX - T_MIN)));
  $('arc').style.strokeDashoffset = C * (1 - f);
  $('arc').style.stroke = `color-mix(in srgb, var(--warm) ${Math.round(Math.max(0, (f - 0.45) / 0.55) * 100)}%, var(--cold))`;
  $('water').textContent = fmt(w);
  if (st.setpoint != null) {
    const fs = Math.min(1, Math.max(0, (st.setpoint - T_MIN) / (T_MAX - T_MIN)));
    $('mark').style.transform = `rotate(${fs * 360}deg)`;
  }
  $('delta').textContent = w != null && st.setpoint != null
    ? (w >= st.setpoint ? t('setpointReached') : `−${(st.setpoint - w).toFixed(1)} °C`)
    : ' ';

  if (spDraft == null) $('sp').textContent = fmt(st.setpoint);
  $('spLabel').textContent = st.setpointLabel ? ctrlText(st.setpointLabel) : t('setpoint');

  $('solar').textContent = fmt(st.solarTemp);
  $('filter').textContent = ctrlText(st.filterText);
  $('heating').textContent = ctrlText(st.heatingText);
  pill($('solarState'), st.icons?.solar);
  pill($('filterState'), st.icons?.filter);
  pill($('heaterState'), st.icons?.heater);

  tile($('tPump'), set.manual?.pump);
  tile($('tAux'), st.auxOn);
  tile($('tEco'), set.manual?.eco);

  $('mHeat').textContent = ctrlText(set.heaterMode);
  $('mSolar').textContent = ctrlText(set.solarMode);
  $('mAux').textContent = ctrlText(set.auxMode);
  $('mWash').textContent = set.manual?.backwash ? t('running') : t('holdToStart');

  $('updated').textContent = s.updatedAt
    ? t('updated', { t: new Date(s.updatedAt).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })
    : ' ';
}

async function cmd(name, value, el, okMsg) {
  el?.classList.add('busy');
  try {
    const r = await fetch('api/cmd', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd: name, value }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Error');
    render(j);
    toast(okMsg || t('cmdSent'));
  } catch (e) {
    toast(e.message, true);
  } finally {
    el?.classList.remove('busy');
  }
}

// Simple toggles / cycles
document.querySelectorAll('[data-cmd]').forEach((el) =>
  el.addEventListener('click', () => cmd(el.dataset.cmd, undefined, el)));

// Light (AUX): interlocked with the filter pump on this controller
const sheet = $('sheet');
const openSheet = () => { sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('open')); };
const closeSheet = () => { sheet.classList.remove('open'); setTimeout(() => (sheet.hidden = true), 250); };
document.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeSheet));

$('tAux').addEventListener('click', () => {
  const turningOn = !state?.status?.auxOn;
  const interlocked = state?.settings?.auxInterlock !== false;
  if (turningOn && interlocked && !pumpRunning(state)) return openSheet();
  cmd('aux_toggle', undefined, $('tAux'));
});
$('auxPumpGo').addEventListener('click', () => {
  closeSheet();
  cmd('aux_on_with_pump', undefined, $('tAux'), t('auxPumpStarted'));
});

// Setpoint stepper with debounce
document.querySelectorAll('[data-step]').forEach((b) =>
  b.addEventListener('click', () => {
    const base = spDraft ?? state?.status?.setpoint ?? 25;
    spDraft = Math.min(40, Math.max(0, Math.round((base + Number(b.dataset.step)) * 2) / 2));
    $('sp').textContent = spDraft.toFixed(1);
    $('spHint').textContent = t('sending');
    clearTimeout(spTimer);
    spTimer = setTimeout(async () => {
      await cmd('setpoint', spDraft, $('sp').parentElement);
      spDraft = null;
      $('spHint').textContent = ' ';
    }, 1200);
  }));

// Backwash: press and hold 1.5 s
(() => {
  const el = $('backwash');
  let t0 = 0, raf = 0;
  const reset = () => { cancelAnimationFrame(raf); el.style.setProperty('--p', '0%'); t0 = 0; };
  const tick = () => {
    const p = Math.min(1, (performance.now() - t0) / 1500);
    el.style.setProperty('--p', p * 100 + '%');
    if (p >= 1) { reset(); cmd('backwash_toggle', undefined, el); return; }
    raf = requestAnimationFrame(tick);
  };
  el.addEventListener('pointerdown', () => { t0 = performance.now(); raf = requestAnimationFrame(tick); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((e) => el.addEventListener(e, reset));
})();

$('refresh').addEventListener('click', async () => {
  $('refresh').classList.add('spin');
  try { render(await (await fetch('api/state')).json()); } finally {
    setTimeout(() => $('refresh').classList.remove('spin'), 400);
  }
});

applyI18n(() => { document.title = t('appTitle'); render(); });
document.title = t('appTitle');

// Live updates via Server-Sent Events (auto-reconnects)
const es = new EventSource('api/events');
es.onmessage = (e) => render(JSON.parse(e.data));
es.onerror = () => { $('dot').className = 'dot off'; $('conn').textContent = t('reconnecting'); };

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
