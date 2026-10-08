// Fake PoolControl-40.NET for local testing, built from real firmware v2.6 responses.
// Run: node mock/mock-osf.js   then   OSF_HOST=http://127.0.0.1:8099 node server.js
import http from 'node:http';

let logged = false;
const PIN = '1234';
const s = { water: 21.6, setpoint: 34.0, solar: 24.3, aux: 0, pump: 0, eco: 0, wash: 0, heat: 0, sol: 0, auxMode: 0 };
const MODES = ['OFF', 'ON', 'auto'];
const cfg = { '0126': 200, '0127': 0, '0111': 0.0, '0084': 180 };
const DAYN = { 7: 'daily', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 0: 'Sunday' };
// timers: kind -> { prefix page, base code, tag, n, slots[] }
const T = {
  fu: { code: 301, tag: 'F', n: 15, title: 'timer filtration', end: 'day', slots: [{ ED: 7, EH: '11', EM: '00', AD: 7, AH: '17', AM: '00' }] },
  ru: { code: 331, tag: 'R', n: 15, title: 'timer backwashing', end: null, slots: [{ ED: 3, EH: '13', EM: '30' }] },
  eu: { code: 316, tag: 'E', n: 15, title: 'timer eco-Mode', end: 'day', slots: [] },
  au: { code: 401, tag: 'A', n: 10, title: 'Timer additional output', end: 'time', slots: [] },
};
const slotText = (t, x) => !x ? ' not programmed'
  : t.end === 'day' ? `${DAYN[x.ED]} ${x.EH}:${x.EM} - ${DAYN[x.AD]} ${x.AH}:${x.AM}`
  : t.end === 'time' ? `${DAYN[x.ED]} ${x.EH}:${x.EM} - ${x.AH}:${x.AM}` : `${DAYN[x.ED]} ${x.EH}:${x.EM}`;
const listPage = (k) => { const t = T[k]; let h = `<body><div class="topnav">${t.title}</div><div class="main">`;
  for (let i = 1; i <= t.n; i++) h += `<button type="button" class="menuline" onclick='window.location.href="set${k}w${String(i).padStart(2, '0')}.htm"' ${i > t.slots.length + 1 ? 'disabled' : ''}><div class="nummer">${i}.</div><div class="zeit">${slotText(t, t.slots[i - 1])}</div></button>`;
  return h + '</div></body>'; };
const slotPage = (k, i) => `<body><form action="modify"><div class="main"><p>currently selected:<br>${slotText(T[k], T[k].slots[i - 1])}</p> <input type="hidden" name="0${T[k].code + i - 1}" value="${T[k].tag}"> <select name="ED"></select></div></form></body>`;
const AUXMODES = ['auto', 'on', 'off'];

const jsn = () => `                     {
"logbild":"user.svg",
"wtival":"${s.water.toFixed(1)}",
"wtsval":"${s.setpoint.toFixed(1)}",
"wtsque":"setpoint",
"stival":"${s.solar.toFixed(1)}",
"atival":"&nbsp;",
"modest":"aux-${s.aux}.gif",
"hzstat":"heating is off",
"flstat":"${s.pump ? 'filtration' : 'standby'}",
"vbld":"blank.gif",
"bbld":"${s.wash ? 'backwash.gif' : 'blank.gif'}",
"fbld":"${s.pump ? 'filter.gif' : 'blank.gif'}",
"hbld":"zhlocked.gif",
"sbld":"shlocked.gif"
}﻿\n`;

const line = (l, r, code) =>
  `<button type="button" class="menuline" onclick='window.location.href="/modify?${code}=i"' ><div class="menu-l">${l}</div><div class="menu-r">${r}</div></button>`;

const pages = {
  '/menfilt.htm': () => `<body><button type="button" class="menuline"><div class="menu-l">duration backwashing</div><div class="menu-r">${cfg['0126']} sec.</div></button><button type="button" class="menuline"><div class="menu-l">duration rinseing</div><div class="menu-r">${cfg['0127']} sec.</div></button></body>`,
  '/index.jsn': jsn,
  '/menheat.htm': () => `<body><div class="main">
    <button type="button" class="menuline" onclick='window.location.href="/setsoll.htm"' ><div class="menu-l">Nominal temperature</div><div class="menu-r">${s.setpoint.toFixed(1)} &deg;C</div></button>
    ${line('Heater operation mode', MODES[s.heat], '0130')}${line('Solar operation mode', MODES[s.sol], '0131')}</div></body>`,
  '/menaux.htm': () => `<body>${line('aux. operation mode', AUXMODES[s.auxMode], '0193')}
    <button type="button" class="menuline"><div class="menu-l">Time limit with manual start</div><div class="menu-r">${cfg['0084']} min.</div></button><button type="button" class="menuline" disabled><div class="menu-l">interlocking</div><div class="menu-r">yes</div></button></body>`,
  '/meneco.htm': () => `<body><button type="button" class="menuline"><div class="menu-l">set temperature reduction for eco-mode</div><div class="menu-r">${cfg['0111'].toFixed(1)} &deg;C</div></button></body>`,
  '/menhand.htm': () => `<body><div class="main">
    <button type="button" class="menu"><a style="vertical-align:top" href="/modify?0025=i"><img class="menu" src="/bilder/t-hand-${s.pump}.gif" alt="heater" loading="lazy"></a><br><div class="mainmenu">filter pump</div></button>
    <button type="button" class="menu"><a href="/modify?0027=i"><img class="menu" src="/bilder/eco40-${s.eco}.gif" alt="info" loading="lazy"></a><br><div class="mainmenu">ECO mode</div></button>
    <button type="button" class="menu"><a href="/modify?0026=i"><img class="menu" src="/bilder/t-rck-${s.wash}.gif" alt="log" loading="lazy"></a><br><div class="mainmenu">backwash</div></button>
    </div></body>`,
};

let active = 0;
const MAXCONN = Number(process.env.MOCK_MAXCONN || 0); // simulate the real controller's tiny server
http.createServer((req, res) => {
  if (MAXCONN && active >= MAXCONN) { req.socket.destroy(); return; }
  active++; res.on('close', () => active--);
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/modify') {
    const q = Object.fromEntries(u.searchParams);
    const tk = Object.keys(q).find((k) => /^0[34]\d\d$/.test(k) && /^[FREA]$/.test(q[k]));
    if (tk) {
      if (!logged) { res.writeHead(302, { Location: '/login.htm' }); return res.end(); }
      const kind = Object.keys(T).find((x) => T[x].tag === q[tk]); const t = T[kind]; const i = +tk - t.code;
      console.log('timer', kind, i + 1, JSON.stringify(q));
      if (q.ED === '-') t.slots.splice(i, 1); else t.slots[i] = { ED: +q.ED, EH: q.EH, EM: q.EM, AD: +q.AD, AH: q.AH, AM: q.AM };
      res.writeHead(302, { Location: '/index.htm' }); return res.end();
    }
    for (const [k, v] of u.searchParams) {
      console.log('modify', k, '=', v);
      if (k === '0003') { logged = v === PIN; continue; }
      if (!logged) { res.writeHead(302, { Location: '/login.htm' }); return res.end(); }
      if (k === '0110') s.setpoint = Number(v);
      if (k in cfg) cfg[k] = Number(v);
      if (k === '0088' && s.pump) s.aux ^= 1; // interlocked with the pump
      if (k === '0025') s.pump ^= 1;
      if (k === '0027') s.eco ^= 1;
      if (k === '0026') s.wash ^= 1;
      if (k === '0130') s.heat = (s.heat + 1) % 3;
      if (k === '0131') s.sol = (s.sol + 1) % 3;
      if (k === '0193') s.auxMode = (s.auxMode + 1) % 3;
    }
    res.writeHead(302, { Location: '/index.htm' });
    return res.end();
  }
  let mm;
  if ((mm = u.pathname.match(/^\/set(fu|ru|eu|au)hr1\.htm$/))) { res.writeHead(200); return res.end(listPage(mm[1])); }
  if ((mm = u.pathname.match(/^\/set(fu|ru|eu|au)w(\d\d)\.htm$/))) { res.writeHead(200); return res.end(slotPage(mm[1], +mm[2])); }
  const p = pages[u.pathname];
  if (!p) { res.writeHead(404); return res.end(); }
  s.water += (Math.random() - 0.5) * 0.1;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(p());
}).listen(8099, () => console.log('Mock OSF on :8099'));
