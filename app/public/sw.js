// Minimal service worker: cache the app shell, never cache the API.
const CACHE = 'pool-v4';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'icon.svg', 'manifest.webmanifest', 'settings.html', 'settings.js', 'i18n.js'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => {
  if (new URL(e.request.url).pathname.includes('/api/')) return;
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request)));
});
