// Optional MQTT bridge with Home Assistant auto-discovery.
// Enabled when MQTT_URL is set (e.g. mqtt://192.168.1.10:1883).
import mqttLib from 'mqtt';

export function startMqtt({ runCommand, getState }) {
  const url = process.env.MQTT_URL;
  if (!url) return null;

  const base = process.env.MQTT_PREFIX || 'poolcontrol';
  const disc = process.env.HA_DISCOVERY_PREFIX || 'homeassistant';
  const id = 'osf_pc40';
  const client = mqttLib.connect(url, {
    username: process.env.MQTT_USER || undefined,
    password: process.env.MQTT_PASS || undefined,
    will: { topic: `${base}/availability`, payload: 'offline', retain: true },
  });

  const objPrefix = process.env.MQTT_OBJECT_PREFIX || 'pool';
  const device = { identifiers: [id], name: process.env.MQTT_DEVICE_NAME || 'Pool', manufacturer: 'OSF (unofficial integration)', model: 'PoolControl-40.NET' };
  const common = {
    device,
    availability_topic: `${base}/availability`,
    state_topic: `${base}/state`,
  };

  const entities = [
    ['sensor', 'water_temp', { name: 'Water temperature', device_class: 'temperature', unit_of_measurement: '°C', state_class: 'measurement', value_template: '{{ value_json.waterTemp }}' }],
    ['sensor', 'solar_temp', { name: 'Solar temperature', device_class: 'temperature', unit_of_measurement: '°C', state_class: 'measurement', value_template: '{{ value_json.solarTemp }}' }],
    ['sensor', 'filter_status', { name: 'Filtration', icon: 'mdi:pump', value_template: '{{ value_json.filterText }}' }],
    ['sensor', 'heating_status', { name: 'Heating', icon: 'mdi:radiator', value_template: '{{ value_json.heatingText }}' }],
    ['sensor', 'heater_mode', { name: 'Heater mode', icon: 'mdi:tune', value_template: '{{ value_json.heaterMode }}' }],
    ['sensor', 'solar_mode', { name: 'Solar mode', icon: 'mdi:solar-power', value_template: '{{ value_json.solarMode }}' }],
    ['binary_sensor', 'online', { name: 'Controller online', device_class: 'connectivity', value_template: "{{ 'ON' if value_json.online else 'OFF' }}" }],
    ['number', 'setpoint', { name: 'Water setpoint', min: 0, max: 40, step: 0.5, unit_of_measurement: '°C', mode: 'box', value_template: '{{ value_json.setpoint }}', command_topic: `${base}/set/setpoint` }],
    ['switch', 'aux', { name: 'Pool light', icon: 'mdi:lightbulb', value_template: "{{ 'ON' if value_json.auxOn else 'OFF' }}", command_topic: `${base}/set/aux` }],
    ['switch', 'pump', { name: 'Manual pump', icon: 'mdi:pump', value_template: "{{ 'ON' if value_json.pumpManual else 'OFF' }}", command_topic: `${base}/set/pump` }],
    ['switch', 'eco', { name: 'ECO mode', icon: 'mdi:leaf', value_template: "{{ 'ON' if value_json.ecoManual else 'OFF' }}", command_topic: `${base}/set/eco` }],
    ['button', 'backwash', { name: 'Backwash', icon: 'mdi:autorenew', command_topic: `${base}/set/backwash` }],
  ];

  client.on('connect', () => {
    console.log('MQTT connected');
    client.publish(`${base}/availability`, 'online', { retain: true });
    for (const [type, key, cfg] of entities) {
      const payload = { ...common, ...cfg, unique_id: `${id}_${key}`, object_id: `${objPrefix}_${key}` };
      if (type === 'button') delete payload.state_topic;
      client.publish(`${disc}/${type}/${id}/${key}/config`, JSON.stringify(payload), { retain: true });
    }
    client.subscribe(`${base}/set/#`);
    publishState(getState());
  });

  client.on('error', (e) => console.error('MQTT error:', e.message));

  // Switches are idempotent: only toggle when the requested state differs
  client.on('message', async (topic, buf) => {
    const what = topic.split('/').pop();
    const msg = buf.toString().trim();
    const s = getState();
    try {
      if (what === 'setpoint') return void (await runCommand('setpoint', Number(msg)));
      if (what === 'backwash') return void (await runCommand('backwash_toggle'));
      const want = msg.toUpperCase() === 'ON';
      const map = {
        aux: ['aux_toggle', s.status?.auxOn],
        pump: ['pump_toggle', s.settings?.manual?.pump],
        eco: ['eco_toggle', s.settings?.manual?.eco],
      };
      let [cmd, current] = map[what] || [];
      // Light is interlocked with the pump: ON starts the pump first if needed (AUX_STARTS_PUMP=false to disable)
      if (what === 'aux' && want && process.env.AUX_STARTS_PUMP !== 'false') cmd = 'aux_on_with_pump';
      if (cmd && Boolean(current) !== want) await runCommand(cmd);
    } catch (e) {
      console.error(`MQTT command ${what} failed:`, e.message);
    }
  });

  function publishState(st) {
    if (!client.connected) return;
    const flat = {
      online: st.online,
      ...(st.status || {}),
      heaterMode: st.settings?.heaterMode,
      solarMode: st.settings?.solarMode,
      pumpManual: st.settings?.manual?.pump,
      ecoManual: st.settings?.manual?.eco,
    };
    delete flat.raw;
    client.publish(`${base}/state`, JSON.stringify(flat), { retain: true });
  }

  return { publishState };
}
