// End-to-end smoke test: starts the mock controller (1 connection max, like the real one) and the app,
// then exercises the API. Run: node test/smoke.mjs
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const env = { ...process.env, OSF_HOST: 'http://127.0.0.1:8099', OSF_PIN: '1234', PORT: '8188', POLL_MS: '2000', MQTT_URL: '' };
const procs = [
  spawn('node', ['mock/mock-osf.js'], { env: { ...env, MOCK_MAXCONN: '1' }, stdio: 'ignore' }),
];
await sleep(500);
procs.push(spawn('node', ['server.js'], { env, stdio: 'inherit' }));
const base = 'http://127.0.0.1:8188';
const api = async (path, body) => {
  const r = await fetch(base + path, body ? { method: 'POST', body: JSON.stringify(body) } : {});
  return [r.status, await r.json()];
};

try {
  await sleep(2500);
  let [code, s] = await api('/api/state');
  assert.equal(code, 200); assert.equal(s.online, true);
  assert.equal(typeof s.status.waterTemp, 'number');
  assert.equal(s.settings.heaterMode, 'OFF');

  [code, s] = await api('/api/cmd', { cmd: 'setpoint', value: 28.5 });
  assert.equal(code, 200); assert.equal(s.status.setpoint, 28.5);

  [code, s] = await api('/api/cmd', { cmd: 'aux_on_with_pump' });
  assert.equal(s.status.auxOn, true); assert.equal(s.settings.manual.pump, true);

  let a;
  [code, a] = await api('/api/advanced');
  assert.equal(code, 200); assert.equal(a.settings.backwashDuration.value, 200);
  assert.equal(a.timers.filter.slots[0].text, 'daily 11:00 - daily 17:00');

  [code, a] = await api('/api/timer', { kind: 'filter', slot: 2, from: { day: 7, h: 20, m: 0 }, to: { day: 7, h: 22, m: 0 } });
  assert.equal(code, 200); assert.equal(a.timers.filter.slots[1].text, 'daily 20:00 - daily 22:00');

  [code, a] = await api('/api/setting', { key: 'rinseDuration', value: 999 });
  assert.equal(code, 400);

  console.log('\n✔ smoke test passed');
} finally {
  procs.forEach((p) => p.kill());
}
