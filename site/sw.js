// Best of Us – service worker
// A képek (art/) és a Firebase-könyvtárak a telefonon maradnak (gyors indulás, kevesebb adatforgalom);
// a játék maga (index.html, version.json) mindig a netről jön, ha van net – így a frissítés azonnal megérkezik.
const V = '2026.10.26-1234';
const ASSETS = 'bou-assets-abbf632f45', PAGES = 'bou-pages-' + V;
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if ((k.startsWith('bou-pages-') && k !== PAGES) || (k.startsWith('bou-assets-') && k !== ASSETS)) await caches.delete(k);   // a régi képtárak is mennek (helyet foglalnak)
    // takarítás: ha egy kép helyett HTML került a gyorsítótárba (kitétel közben a Cloudflare az index.html-t adta vissza), töröljük
    try { const c = await caches.open(ASSETS);
      for (const r of await c.keys()) { const h = await c.match(r); if (h && isHtml(h) && /\/(art|vendor|icons)\//.test(new URL(r.url).pathname)) await c.delete(r); } } catch (err) {}
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
  if (/\.(mp4|m4a|mp3)$/.test(url.pathname)) return;   // videók: a böngésző kezeli (iPhone-on darabokban kéri le, a gyorsítótárból nem indulna el)
  if (/\/(art|vendor|icons)\//.test(url.pathname)) { e.respondWith(cacheFirst(req, ASSETS)); return; }
  e.respondWith(networkFirst(req, PAGES));
});
const isHtml = res => (res.headers.get('content-type') || '').includes('text/html');
async function cacheFirst(req, name) {
  const c = await caches.open(name), hit = await c.match(req);
  if (hit && !isHtml(hit)) return hit;
  const res = await fetch(req);
  // a hiányzó fájlra a Cloudflare 200-as index.html-t ad – azt nem tesszük el képként
  if ((res.ok && !isHtml(res)) || res.type === 'opaque') c.put(req, res.clone());
  return res;
}
async function networkFirst(req, name) {
  const c = await caches.open(name);
  try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }
  catch { const hit = await c.match(req, { ignoreSearch: true }); if (hit) return hit; throw new Error('offline'); }
}
