// Configuration loader.
// - Standalone / Docker: plain environment variables (see .env.example).
// - Home Assistant add-on: options from /data/options.json are mapped to the same variables,
//   and the Mosquitto broker is discovered through the Supervisor API when MQTT_URL is empty.
import { readFileSync, existsSync } from 'node:fs';

const OPTIONS_FILE = process.env.ADDON_OPTIONS_FILE || '/data/options.json';
const MAP = {
  controller_host: 'OSF_HOST', pin: 'OSF_PIN', poll_interval: 'POLL_MS',
  mqtt_url: 'MQTT_URL', mqtt_user: 'MQTT_USER', mqtt_password: 'MQTT_PASS', mqtt_prefix: 'MQTT_PREFIX',
  mqtt_device_name: 'MQTT_DEVICE_NAME', aux_starts_pump: 'AUX_STARTS_PUMP', app_password: 'APP_PASSWORD',
};

export const isAddon = existsSync(OPTIONS_FILE) && !!process.env.SUPERVISOR_TOKEN;

if (existsSync(OPTIONS_FILE)) {
  try {
    const opts = JSON.parse(readFileSync(OPTIONS_FILE, 'utf8'));
    for (const [k, env] of Object.entries(MAP)) {
      let v = opts[k];
      if (v === undefined || v === null || v === '') continue;
      if (k === 'poll_interval') v = Number(v) * 1000; // seconds in the add-on UI
      process.env[env] = String(v);
    }
    console.log('Loaded add-on options');
  } catch (e) {
    console.error('Could not read add-on options:', e.message);
  }
}

// Ask the Supervisor for the MQTT service (Mosquitto add-on) when running as an add-on
export async function resolveMqtt() {
  if (process.env.MQTT_URL || !process.env.SUPERVISOR_TOKEN) return;
  try {
    const r = await fetch('http://supervisor/services/mqtt', { headers: { Authorization: `Bearer ${process.env.SUPERVISOR_TOKEN}` } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const { data } = await r.json();
    process.env.MQTT_URL = `${data.ssl ? 'mqtts' : 'mqtt'}://${data.host}:${data.port}`;
    process.env.MQTT_USER = data.username || '';
    process.env.MQTT_PASS = data.password || '';
    console.log(`MQTT broker discovered via Supervisor: ${data.host}:${data.port}`);
  } catch (e) {
    console.log('No MQTT service from Supervisor (MQTT disabled):', e.message);
  }
}
