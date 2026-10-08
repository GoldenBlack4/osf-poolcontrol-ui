import { resolveMqtt } from './config.js'; // must stay first: loads add-on options into env
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readStatus, readSettings, sendCommand, COMMANDS, osfHost, readAdvanced, writeSetting, readTimers, writeTimer, debugPage } from './osf.js';
import { startMqtt } from './mqtt.js';

const PORT = Number(process.env.PORT || 8080);
const POLL_MS = Number(process.env.POLL_MS || 10000);
const SETTINGS_EVERY = Number(process.env.SETTINGS_EVERY || 6); // settings every N polls
const AUTH = process.env.APP_PASSWORD || ''; // optional basic-auth password (user: pool)
const PUBLIC = join(fileURLToPath(new URL('.', import.meta.url)), 'public');

let state = { online: false, updatedAt: null, error: null, status: null, settings: null };
const clients = new Set();
let pollCount = 0;
let mqtt = null;

function broadcast() {
  const data = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of clients) res.write(data);
  mqtt?.publishState(state);
}

async function poll(forceSettings = false) {
  try {
    if (!osfHost) throw new Error('Controller address not configured (OSF_HOST)');
    const status = await readStatus();
    let settings = state.settings;
    if (forceSettings || !settings || pollCount % SETTINGS_EVERY === 0) settings = await readSettings();
    state = { online: true, updatedAt: new Date().toISOString(), error: null, status, settings };
  } catch (e) {
    state = { ...state, online: false, error: e.message, updatedAt: new Date().toISOString() };
  }
  pollCount++;
  broadcast();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pumpRunning = () => state.status?.icons?.filter === 'on' || state.settings?.manual?.pump === true ||
  (state.status?.filterText && !/standby/i.test(state.status.filterText));

export async function runCommand(cmd, value) {
  if (cmd === 'aux_on_with_pump') {
    // The light (AUX) is interlocked with the filter pump: start the pump first
    await poll(true);
    if (!pumpRunning()) { await sendCommand('pump_toggle'); await sleep(2500); }
    if (!state.status?.auxOn) await sendCommand('aux_toggle');
  } else {
    await sendCommand(cmd, value);
  }
  await new Promise((r) => setTimeout(r, 800)); // let the controller apply it
  await poll(true);
  return state;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

function authorized(req) {
  if (!AUTH) return true;
  const h = req.headers.authorization || '';
  const [, b64] = h.split(' ');
  const [, pass] = Buffer.from(b64 || '', 'base64').toString().split(':');
  return pass === AUTH;
}

const json = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
};

const server = http.createServer(async (req, res) => {
  if (!authorized(req)) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Pool"' });
    return res.end();
  }
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/api/state') return json(res, 200, state);

  if (url.pathname === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(state)}\n\n`);
    clients.add(res);
    const ka = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ka); clients.delete(res); });
    return;
  }

  if (url.pathname === '/api/commands') return json(res, 200, COMMANDS);

  if (url.pathname === '/api/cmd' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const { cmd, value } = JSON.parse(body || '{}');
        json(res, 200, await runCommand(cmd, value));
      } catch (e) {
        json(res, e.code === 'LOGIN_REQUIRED' ? 403 : 400, { error: e.message, code: e.code });
      }
    });
    return;
  }

  // Advanced settings (read on demand, not polled)
  if (url.pathname === '/api/advanced' && req.method === 'GET') {
    try {
      const settings = await readAdvanced();
      const timers = await readTimers();
      return json(res, 200, { settings, timers });
    } catch (e) { return json(res, 502, { error: e.message }); }
  }

  if ((url.pathname === '/api/setting' || url.pathname === '/api/timer') && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const d = JSON.parse(body || '{}');
        if (url.pathname === '/api/setting') await writeSetting(d.key, d.value);
        else await writeTimer(d.kind, Number(d.slot), d);
        await new Promise((r) => setTimeout(r, 600));
        const settings = await readAdvanced();
        const timers = await readTimers();
        poll(true);
        json(res, 200, { settings, timers });
      } catch (e) {
        json(res, e.code === 'LOGIN_REQUIRED' ? 403 : 400, { error: e.message, code: e.code });
      }
    });
    return;
  }

  if (url.pathname === '/api/debug') {
    try {
      const html = await debugPage(url.searchParams.get('page') || '/index.jsn');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(html);
    } catch (e) { return json(res, 502, { error: e.message }); }
  }

  if (url.pathname === '/healthz') return json(res, state.online ? 200 : 503, { online: state.online });

  // Static files
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (p === '/' || p === '') p = '/index.html';
  try {
    const file = await readFile(join(PUBLIC, p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(file);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});

if (!osfHost) {
  console.error('OSF_HOST is not set: please configure the IP address of your PoolControl controller.');
}

server.listen(PORT, async () => {
  console.log(`OSF PoolControl UI on :${PORT} — controller ${osfHost || '(not configured)'}, poll ${POLL_MS} ms`);
  await resolveMqtt();
  mqtt = startMqtt({ runCommand, getState: () => state });
  poll(true);
  setInterval(poll, POLL_MS);
});
