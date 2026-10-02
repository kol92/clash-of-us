// Best of Us – service worker
// A képek (art/) és a Firebase-könyvtárak a telefonon maradnak (gyors indulás, kevesebb adatforgalom);
// a játék maga (index.html, version.json) mindig a netről jön, ha van net – így a frissítés azonnal megérkezik.
const V = '2026.10.02-2213';
const ASSETS = 'bou-assets-a74d157eae', PAGES = 'bou-pages-' + V;
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('bou-pages-') && k !== PAGES) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    // Google betűtípusok: gyorsítótárból, ha már megvan
    if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) e.respondWith(cacheFirst(req, ASSETS));
    return;   // Firebase-hívások: mindig élőben
  }
  if (url.pathname.endsWith('version.json')) return;   // mindig élőben
  if (/\/(art|vendor|icons)\//.test(url.pathname)) { e.respondWith(cacheFirst(req, ASSETS)); return; }
  e.respondWith(networkFirst(req, PAGES));
});
async function cacheFirst(req, name) {
  const c = await caches.open(name), hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res;
}
async function networkFirst(req, name) {
  const c = await caches.open(name);
  try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }
  catch { const hit = await c.match(req, { ignoreSearch: true }); if (hit) return hit; throw new Error('offline'); }
}
