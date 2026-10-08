// Tiny i18n: English by default, choice remembered per browser.
const DICT = {
  en: {
    appTitle: 'Pool', connecting: 'Connecting…', connected: 'Controller connected', offline: 'Offline', reconnecting: 'Reconnecting…',
    water: 'Water', setpoint: 'Setpoint', setpointReached: 'Setpoint reached', sending: 'Sending…',
    solar: 'Solar', filtration: 'Filtration', heating: 'Heating',
    commands: 'Controls', pump: 'Pump', light: 'Light', eco: 'ECO',
    modes: 'Modes', heaterMode: 'Heater mode', solarMode: 'Solar mode', auxMode: 'Light (AUX) mode',
    backwash: 'Backwash', holdToStart: 'Hold to start', running: 'Running',
    advancedLink: 'Timers & advanced settings', updated: 'Updated {t}', cmdSent: 'Command sent',
    on: 'On', off: 'Off', active: 'Active', inactive: 'Inactive', locked: 'Locked',
    refresh: 'Refresh', settings: 'Settings', back: 'Back', language: 'Language',
    lower: 'Lower', raise: 'Raise', less: 'Less', more: 'More',
    auxPumpTitle: 'Pump required', auxPumpText: 'The pool light only works while the filter pump is running. Start the pump and the light?',
    auxPumpGo: 'Start pump + light', cancel: 'Cancel', auxPumpStarted: 'Pump and light started',
    // settings page
    settingsTitle: 'Settings', readAt: 'Read from controller at {t}', unreachable: 'Controller unreachable', loading: 'Loading…',
    secFilter: 'Filtration', introFilter: 'Time slots during which the filter pump runs.',
    secBackwash: 'Backwash', introBackwash: 'Automatic backwash starts.',
    secEco: 'ECO mode', introEco: 'Time slots with a lowered setpoint.',
    secAux: 'Light (AUX)', introAux: 'Time slots for the auxiliary output (pool light). It only runs while the pump runs.',
    addSlot: '＋ Add a time slot', noSlots: 'No time slot programmed', perDay: '{d} / day',
    footNote: 'Changes are written directly to the controller.',
    slotN: 'slot {n}', newSlot: '(new)', start: 'Start', departure: 'Start time', end: 'End',
    del: 'Delete', confirmQ: 'Confirm?', save: 'Save', durationX: 'Duration: {d}', overlapsN: '⚠ overlaps slot {n}',
    saved: 'Time slot saved', deleted: 'Time slot deleted',
    backwashDuration: 'Backwash duration', rinseDuration: 'Rinse duration', ecoReduction: 'ECO setpoint reduction', auxTimeLimit: 'Light limit when started manually',
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Every day'],
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Daily'],
    hFmt: '{h} h{m}',
    ctrl: { 'heating is off': 'Off', 'heating is on': 'Heating', standby: 'Standby', filtration: 'Filtering', auto: 'Auto', on: 'On', off: 'Off', setpoint: 'Setpoint' },
  },
  fr: {
    appTitle: 'Piscine', connecting: 'Connexion…', connected: 'Contrôleur connecté', offline: 'Hors ligne', reconnecting: 'Reconnexion…',
    water: 'Eau', setpoint: 'Consigne', setpointReached: 'Consigne atteinte', sending: 'Envoi…',
    solar: 'Solaire', filtration: 'Filtration', heating: 'Chauffage',
    commands: 'Commandes', pump: 'Pompe', light: 'Lumière', eco: 'ECO',
    modes: 'Modes', heaterMode: 'Mode chauffage', solarMode: 'Mode solaire', auxMode: 'Mode lumière (AUX)',
    backwash: 'Contre-lavage', holdToStart: 'Maintenir pour lancer', running: 'En cours',
    advancedLink: 'Minuteries et réglages avancés', updated: 'Mis à jour {t}', cmdSent: 'Commande envoyée',
    on: 'Marche', off: 'Arrêt', active: 'Actif', inactive: 'Inactif', locked: 'Verrouillé',
    refresh: 'Actualiser', settings: 'Réglages', back: 'Retour', language: 'Langue',
    lower: 'Baisser', raise: 'Augmenter', less: 'Moins', more: 'Plus',
    auxPumpTitle: 'Pompe nécessaire', auxPumpText: 'La lumière de la piscine ne fonctionne que lorsque la pompe de filtration tourne. Démarrer la pompe et la lumière ?',
    auxPumpGo: 'Démarrer pompe + lumière', cancel: 'Annuler', auxPumpStarted: 'Pompe et lumière démarrées',
    settingsTitle: 'Réglages', readAt: 'Lu depuis le contrôleur à {t}', unreachable: 'Contrôleur injoignable', loading: 'Chargement…',
    secFilter: 'Filtration', introFilter: 'Plages pendant lesquelles la pompe de filtration tourne.',
    secBackwash: 'Contre-lavage', introBackwash: 'Départs automatiques du contre-lavage.',
    secEco: 'Mode ECO', introEco: 'Plages où la consigne est abaissée.',
    secAux: 'Lumière (AUX)', introAux: 'Plages de la sortie auxiliaire (éclairage). Elle ne fonctionne que pompe en marche.',
    addSlot: '＋ Ajouter une plage', noSlots: 'Aucune plage programmée', perDay: '{d} / jour',
    footNote: 'Les modifications sont écrites directement dans le contrôleur.',
    slotN: 'plage {n}', newSlot: '(nouvelle)', start: 'Début', departure: 'Départ', end: 'Fin',
    del: 'Supprimer', confirmQ: 'Confirmer ?', save: 'Enregistrer', durationX: 'Durée : {d}', overlapsN: '⚠ chevauche la plage {n}',
    saved: 'Plage enregistrée', deleted: 'Plage supprimée',
    backwashDuration: 'Durée du contre-lavage', rinseDuration: 'Durée du rinçage', ecoReduction: 'Abaissement en mode ECO', auxTimeLimit: 'Limite lumière en marche manuelle',
    days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Tous les jours'],
    daysShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Chaque jour'],
    hFmt: '{h} h{m}',
    ctrl: { 'heating is off': 'Arrêté', 'heating is on': 'En marche', standby: 'En attente', filtration: 'Filtration', auto: 'Auto', on: 'Marche', off: 'Arrêt', setpoint: 'Consigne' },
  },
  de: {
    appTitle: 'Pool', connecting: 'Verbinde…', connected: 'Steuerung verbunden', offline: 'Offline', reconnecting: 'Verbinde neu…',
    water: 'Wasser', setpoint: 'Sollwert', setpointReached: 'Sollwert erreicht', sending: 'Senden…',
    solar: 'Solar', filtration: 'Filterung', heating: 'Heizung',
    commands: 'Steuerung', pump: 'Pumpe', light: 'Licht', eco: 'ECO',
    modes: 'Betriebsarten', heaterMode: 'Heizung', solarMode: 'Solar', auxMode: 'Licht (AUX)',
    backwash: 'Rückspülen', holdToStart: 'Gedrückt halten', running: 'Läuft',
    advancedLink: 'Zeitschaltuhren & Einstellungen', updated: 'Aktualisiert {t}', cmdSent: 'Befehl gesendet',
    on: 'Ein', off: 'Aus', active: 'Aktiv', inactive: 'Inaktiv', locked: 'Gesperrt',
    refresh: 'Aktualisieren', settings: 'Einstellungen', back: 'Zurück', language: 'Sprache',
    lower: 'Senken', raise: 'Erhöhen', less: 'Weniger', more: 'Mehr',
    auxPumpTitle: 'Pumpe erforderlich', auxPumpText: 'Das Poollicht funktioniert nur bei laufender Filterpumpe. Pumpe und Licht einschalten?',
    auxPumpGo: 'Pumpe + Licht ein', cancel: 'Abbrechen', auxPumpStarted: 'Pumpe und Licht eingeschaltet',
    settingsTitle: 'Einstellungen', readAt: 'Von der Steuerung gelesen um {t}', unreachable: 'Steuerung nicht erreichbar', loading: 'Laden…',
    secFilter: 'Filterung', introFilter: 'Zeiten, in denen die Filterpumpe läuft.',
    secBackwash: 'Rückspülen', introBackwash: 'Automatische Rückspül-Starts.',
    secEco: 'ECO-Modus', introEco: 'Zeiten mit abgesenktem Sollwert.',
    secAux: 'Licht (AUX)', introAux: 'Zeiten für den Zusatzausgang (Poollicht). Nur bei laufender Pumpe aktiv.',
    addSlot: '＋ Zeitfenster hinzufügen', noSlots: 'Kein Zeitfenster programmiert', perDay: '{d} / Tag',
    footNote: 'Änderungen werden direkt in die Steuerung geschrieben.',
    slotN: 'Fenster {n}', newSlot: '(neu)', start: 'Beginn', departure: 'Startzeit', end: 'Ende',
    del: 'Löschen', confirmQ: 'Bestätigen?', save: 'Speichern', durationX: 'Dauer: {d}', overlapsN: '⚠ überschneidet Fenster {n}',
    saved: 'Zeitfenster gespeichert', deleted: 'Zeitfenster gelöscht',
    backwashDuration: 'Rückspüldauer', rinseDuration: 'Klarspüldauer', ecoReduction: 'ECO-Absenkung', auxTimeLimit: 'Licht-Zeitlimit bei Handstart',
    days: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Täglich'],
    daysShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'Täglich'],
    hFmt: '{h} h{m}',
    ctrl: { 'heating is off': 'Aus', 'heating is on': 'Heizt', standby: 'Bereit', filtration: 'Filtert', auto: 'Auto', on: 'Ein', off: 'Aus', setpoint: 'Sollwert' },
  },
};

export const LANGS = [['en', 'EN'], ['fr', 'FR'], ['de', 'DE']];
const LOCALE = { en: 'en-GB', fr: 'fr-CH', de: 'de-CH' };

function stored() { try { return localStorage.getItem('lang'); } catch { return null; } }
export let lang = DICT[stored()] ? stored() : 'en';
export const locale = () => LOCALE[lang];

export function t(key, vars = {}) {
  const v = DICT[lang][key] ?? DICT.en[key] ?? key;
  return typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : v;
}

// Translate a status text coming from the controller (English firmware)
export function ctrlText(s) {
  if (s == null || s === '') return '—';
  const m = DICT[lang].ctrl;
  return m[s] ?? m[String(s).toLowerCase()] ?? s;
}

// day code 0..6 = Sun..Sat, 7 = daily
export const dayName = (d) => t('days')[d] ?? '?';
export const dayShort = (d) => t('daysShort')[d] ?? '?';
export const dayOrder = [7, 1, 2, 3, 4, 5, 6, 0];

// Apply [data-i18n], [data-i18n-aria], [data-i18n-title] and wire the language picker
export function applyI18n(onChange) {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  document.querySelectorAll('[data-i18n-title]').forEach((el) => (el.title = t(el.dataset.i18nTitle)));
  const sel = document.getElementById('lang');
  if (sel && !sel.dataset.wired) {
    sel.innerHTML = LANGS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    sel.dataset.wired = '1';
    sel.addEventListener('change', () => {
      lang = sel.value;
      try { localStorage.setItem('lang', lang); } catch {}
      applyI18n(onChange);
      onChange?.();
    });
  }
  if (sel) { sel.value = lang; sel.setAttribute('aria-label', t('language')); }
}
