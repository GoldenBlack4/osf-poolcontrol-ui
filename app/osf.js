// Client for the OSF PoolControl-40.NET built-in web server.
// Reverse-engineered from firmware v2.6 (PC-40.net):
//   GET /index.jsn              -> live status (JSON)
//   GET /menheat.htm etc.       -> settings pages (menu-l / menu-r pairs)
//   GET /menhand.htm            -> manual-control buttons (icon *-0 / *-1 = off/on)
//   GET /modify?CODE=i          -> toggle / cycle a value
//   GET /modify?0110=34.0       -> set nominal temperature

let HOST = (process.env.OSF_HOST || '').trim().replace(/\/+$/, '');
if (HOST && !/^https?:\/\//.test(HOST)) HOST = 'http://' + HOST; // accept a bare IP
const TIMEOUT = Number(process.env.OSF_TIMEOUT_MS || 6000);

// Whitelisted commands -> controller codes
export const COMMANDS = {
  aux_toggle:        { code: '0088', label: 'Light / AUX output (toggle)' },
  pump_toggle:       { code: '0025', label: 'Manual filter pump (toggle)' },
  backwash_toggle:   { code: '0026', label: 'Backwash (toggle)' },
  eco_toggle:        { code: '0027', label: 'ECO mode (toggle)' },
  heater_mode_cycle: { code: '0130', label: 'Heater mode (cycle)' },
  solar_mode_cycle:  { code: '0131', label: 'Solar mode (cycle)' },
  aux_mode_cycle:    { code: '0193', label: 'AUX mode (cycle)' },
  setpoint:          { code: '0110', label: 'Water setpoint', min: 0, max: 40 },
  aux_on_with_pump:  { code: null,   label: 'Start pump, then light' }, // handled in server.js
};

// The controller's embedded web server handles very few parallel connections:
// run every request one after the other, with a small pause and one retry.
let chain = Promise.resolve();
const GAP_MS = Number(process.env.OSF_GAP_MS || 150);
function queued(fn) {
  const run = chain.then(async () => {
    try { return await fn(); }
    catch (e) { await new Promise((r) => setTimeout(r, 400)); return fn(); } // one retry
    finally { await new Promise((r) => setTimeout(r, GAP_MS)); }
  });
  chain = run.catch(() => {});
  return run;
}

function get(path, opts) { return queued(() => getNow(path, opts)); }

async function getNow(path, { lenient = false } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(HOST + path, { signal: ctrl.signal, redirect: lenient ? 'manual' : 'follow', headers: { 'Cache-Control': 'no-cache' } });
    if (lenient && r.status < 400) return (await r.text()) || '';
    if (!r.ok) throw new Error(`HTTP ${r.status} on ${path}`);
    // Controller serves UTF-8 (sometimes with BOM / padding spaces)
    return (await r.text()).replace(/^﻿/, '').replace(/﻿/g, '');
  } finally {
    clearTimeout(t);
  }
}

const decode = (s = '') =>
  s.replace(/&nbsp;/g, ' ').replace(/&deg;/g, '°').replace(/&amp;/g, '&')
   .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const num = (s) => {
  const m = String(s ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

// Icon file -> semantic state
const iconState = (f = '') => {
  if (!f || f.startsWith('blank')) return 'off';
  if (f.includes('locked')) return 'locked';
  return 'on';
};

export async function readStatus() {
  const raw = JSON.parse((await get('/index.jsn')).trim());
  return {
    waterTemp: num(raw.wtival),
    setpoint: num(raw.wtsval),
    setpointLabel: decode(raw.wtsque),
    solarTemp: num(raw.stival),
    airTemp: num(raw.atival),
    auxOn: /-1\./.test(raw.modest || ''),
    heatingText: decode(raw.hzstat),
    filterText: decode(raw.flstat),
    icons: {
      valve: iconState(raw.vbld),
      backwash: iconState(raw.bbld),
      filter: iconState(raw.fbld),
      heater: iconState(raw.hbld),
      solar: iconState(raw.sbld),
    },
    raw,
  };
}

// Parse menu lines: <div class="menu-l">Label</div> ... <div class="menu-r">Value</div>
// Tolerant to quoting/attributes/whitespace: collect both lists in order and zip them.
function menuPairs(html) {
  const out = {};
  const pick = (cls) => [...html.matchAll(new RegExp(`<div[^>]*class=["']?${cls}["']?[^>]*>([\\s\\S]*?)<\\/div>`, 'gi'))].map((m) => decode(m[1]));
  const L = pick('menu-l'), R = pick('menu-r');
  L.forEach((l, i) => { if (R[i] != null) out[l] = R[i]; });
  // lower-case aliases for robust lookups
  for (const [k, v] of Object.entries(out)) out[k.toLowerCase()] = v;
  return out;
}

export async function readSettings() {
  const [heat, aux, eco, hand] = await Promise.all(
    ['/menheat.htm', '/menaux.htm', '/meneco.htm', '/menhand.htm'].map((p) => get(p).catch(() => ''))
  );
  const h = menuPairs(heat), a = menuPairs(aux), e = menuPairs(eco);
  const handIcon = (code) => {
    const m = hand.match(new RegExp(`modify\\?${code}=i"[^>]*>\\s*<img[^>]*src="[^"]*?([\\w-]+)\\.gif"`));
    return m ? /-1$/.test(m[1]) : null;
  };
  return {
    heaterMode: h['heater operation mode'] ?? null,
    solarMode: h['solar operation mode'] ?? null,
    auxMode: a['aux. operation mode'] ?? null,
    auxInterlock: a['interlocking'] == null ? null : /^(yes|ja|oui|on)$/i.test(a['interlocking']),
    auxTimeLimitMin: num(a['time limit with manual start']),
    ecoReduction: num(e['set temperature reduction for eco-mode']),
    manual: {
      pump: handIcon('0025'),
      eco: handIcon('0027'),
      backwash: handIcon('0026'),
    },
  };
}

// Raw request without following redirects (used for /modify)
function raw(path) { return queued(() => rawNow(path)); }

async function rawNow(path) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(HOST + path, { signal: ctrl.signal, redirect: 'manual', headers: { 'Cache-Control': 'no-cache' } });
    return { status: r.status, location: r.headers.get('location') || '', body: await r.text().catch(() => '') };
  } finally {
    clearTimeout(t);
  }
}

const PIN = (process.env.OSF_PIN || '').trim();
const needsLogin = (r) => /login/i.test(r.location) || /name="0003"/.test(r.body);

// Login = GET /modify?0003=<PIN> (session is bound to our IP and may expire)
export async function login() {
  if (!PIN) return false;
  if (!/^\d{4}$/.test(PIN)) throw new Error('OSF_PIN must be 4 digits');
  const r = await raw(`/modify?0003=${PIN}`);
  if (r.status >= 400) throw new Error(`Login refused (HTTP ${r.status})`);
  return true;
}

// Send any /modify request (logs in first). params: object or query string
export async function modify(params) {
  const qs = typeof params === 'string' ? params : new URLSearchParams(params).toString();
  await login(); // always (re)login first: cheap, and avoids expired sessions
  let r = await raw(`/modify?${qs}`);
  if (needsLogin(r)) {
    if (!PIN) {
      const err = new Error('The controller requires a PIN: set OSF_PIN in .env');
      err.code = 'LOGIN_REQUIRED';
      throw err;
    }
    await login();
    r = await raw(`/modify?${qs}`);
    if (needsLogin(r)) {
      const err = new Error('PIN rejected by the controller');
      err.code = 'LOGIN_REQUIRED';
      throw err;
    }
  }
  if (r.status >= 400) throw new Error(`Command rejected (HTTP ${r.status})`);
  return true;
}

export async function sendCommand(cmd, value) {
  const c = COMMANDS[cmd];
  if (!c) throw new Error(`Unknown command: ${cmd}`);
  let v = 'i';
  if (cmd === 'setpoint') {
    const n = Number(value);
    if (!Number.isFinite(n) || n < c.min || n > c.max) throw new Error(`Setpoint out of range (${c.min}–${c.max} °C)`);
    v = (Math.round(n * 2) / 2).toFixed(1); // 0.5 °C steps
  }
  return modify(`${c.code}=${v}`);
}

// ---------- Advanced settings ----------

// Numeric settings: code, limits, how to format, and where to read the current value
export const SETTINGS = {
  backwashDuration: { code: '0126', min: 0, max: 900, step: 10, unit: 's', label: 'Backwash duration', page: '/menfilt.htm', key: 'duration backwashing' },
  rinseDuration:    { code: '0127', min: 0, max: 120, step: 5, unit: 's', label: 'Rinse duration', page: '/menfilt.htm', key: 'duration rinseing' },
  ecoReduction:     { code: '0111', min: 0, max: 20, step: 0.5, unit: '°C', decimals: 1, label: 'ECO setpoint reduction', page: '/meneco.htm', key: 'set temperature reduction for eco-mode' },
  auxTimeLimit:     { code: '0084', min: 0, max: 600, step: 10, unit: 'min', label: 'AUX limit when started manually', page: '/menaux.htm', key: 'Time limit with manual start' },
};

export async function readAdvanced() {
  const pages = [...new Set(Object.values(SETTINGS).map((d) => d.page))];
  const html = {};
  for (const p of pages) html[p] = menuPairs(await get(p));
  const out = {};
  for (const [k, d] of Object.entries(SETTINGS)) {
    out[k] = { ...d, value: num(html[d.page]?.[d.key.toLowerCase()]) };
    delete out[k].page; delete out[k].key;
  }
  return out;
}

export async function writeSetting(key, value) {
  const d = SETTINGS[key];
  if (!d) throw new Error(`Unknown setting: ${key}`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < d.min || n > d.max) throw new Error(`Value out of range (${d.min}–${d.max} ${d.unit})`);
  return modify(`${d.code}=${d.decimals ? n.toFixed(d.decimals) : Math.round(n)}`);
}

// Timers. Day codes: 7 = daily, 1..6 = Mon..Sat, 0 = Sunday
export const TIMERS = {
  filter:   { list: '/setfuhr1.htm', label: 'Filtration', hasEnd: true, endDay: true },
  backwash: { list: '/setruhr1.htm', label: 'Backwash (toggle)', hasEnd: false },
  eco:      { list: '/seteuhr1.htm', label: 'ECO mode (toggle)', hasEnd: true, endDay: true },
  aux:      { list: '/setauhr1.htm', label: 'AUX output', hasEnd: true, endDay: false },
};
const DAYS = { daily: 7, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };

function parseSlotText(txt) {
  const t = decode(txt);
  if (!t || /not programmed/i.test(t)) return null;
  // "daily 11:00 - daily 17:00" | "Wednesday 13:30" | "Monday 08:00 - 10:00"
  const m = t.match(/^(\w+)\s+(\d{1,2}):(\d{2})(?:\s*-\s*(?:(\w+)\s+)?(\d{1,2}):(\d{2}))?/);
  if (!m) return { text: t };
  const from = { day: DAYS[m[1].toLowerCase()] ?? null, h: +m[2], m: +m[3] };
  const to = m[5] != null ? { day: m[4] ? DAYS[m[4].toLowerCase()] ?? null : from.day, h: +m[5], m: +m[6] } : null;
  return { text: t, from, to };
}

export async function readTimers() {
  const out = {};
  for (const [kind, def] of Object.entries(TIMERS)) {
    const html = await get(def.list);
    const re = /href="\/?(set\w+\.htm)"'\s*(disabled)?\s*>\s*<div class="nummer"[^>]*>\s*(\d+)\.?\s*<\/div>\s*<div class="zeit"[^>]*>([\s\S]*?)<\/div>/g;
    const slots = [];
    let m;
    while ((m = re.exec(html))) slots.push({ slot: +m[3], page: m[1], enabled: !m[2], ...(parseSlotText(m[4]) || { text: null }) });
    if (!slots.length) throw new Error(`Timer ${kind}: unexpected page format (${def.list})`);
    out[kind] = { ...def, slots };
    delete out[kind].list;
  }
  return out;
}

const pad = (n) => String(n).padStart(2, '0');
const checkTime = (t, what) => {
  if (!t || !Number.isInteger(+t.h) || !Number.isInteger(+t.m) || t.h < 0 || t.h > 23 || t.m < 0 || t.m > 59)
    throw new Error(`Invalid ${what} time`);
};

// Write one timer slot. data = { from:{day,h,m}, to:{day?,h,m} } or { clear:true }
export async function writeTimer(kind, slot, data) {
  const def = TIMERS[kind];
  if (!def) throw new Error(`Unknown timer: ${kind}`);
  const pageName = def.list.replace('uhr1.htm', `uw${pad(slot)}.htm`);
  const html = await get(pageName);
  const hidden = html.match(/<input type="hidden" name="(\d{4})" value="(\w)">/);
  if (!hidden) throw new Error('Time slot not found on the controller');
  const p = new URLSearchParams();
  p.set(hidden[1], hidden[2]);
  if (data.clear) {
    p.set('ED', '-'); p.set('EH', '--'); p.set('EM', '--');
    if (def.hasEnd) { if (def.endDay) p.set('AD', '-'); p.set('AH', '--'); p.set('AM', '--'); }
  } else {
    const { from, to } = data;
    checkTime(from, 'start');
    if (![0, 1, 2, 3, 4, 5, 6, 7].includes(+from.day)) throw new Error('Invalid day');
    p.set('ED', String(from.day)); p.set('EH', pad(from.h)); p.set('EM', pad(from.m));
    if (def.hasEnd) {
      checkTime(to, 'end');
      if (def.endDay) p.set('AD', String(to.day ?? from.day));
      p.set('AH', pad(to.h)); p.set('AM', pad(to.m));
    }
  }
  return modify(p.toString());
}

// Diagnostic: raw HTML of a controller page (GET only, .htm/.jsn)
export async function debugPage(path) {
  if (!/^\/[\w-]+\.(htm|jsn)$/.test(path)) throw new Error('Invalid path');
  return get(path);
}

export const osfHost = HOST;
