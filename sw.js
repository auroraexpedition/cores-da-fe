// gerado por build.py
const VERSION = 'cdf-be1cb6ce36';
const FILES = ["./", "anunciacao.color.webp", "anunciacao.data.json", "anunciacao.line.webp", "anunciacao.original.jpg", "anunciacao.regions.png", "app.js", "apple-touch-icon.png", "bom-pastor.color.webp", "bom-pastor.data.json", "bom-pastor.line.webp", "bom-pastor.original.jpg", "bom-pastor.regions.png", "catalog.json", "crucificado.color.webp", "crucificado.data.json", "crucificado.line.webp", "crucificado.original.jpg", "crucificado.regions.png", "favicon.png", "guadalupe.color.webp", "guadalupe.data.json", "guadalupe.line.webp", "guadalupe.original.jpg", "guadalupe.regions.png", "icon-192.png", "icon-512.png", "imaculada.color.webp", "imaculada.data.json", "imaculada.line.webp", "imaculada.original.jpg", "imaculada.regions.png", "manifest.webmanifest", "maskable-512.png", "misericordia.color.webp", "misericordia.data.json", "misericordia.line.webp", "misericordia.original.jpg", "misericordia.regions.png", "natividade.color.webp", "natividade.data.json", "natividade.line.webp", "natividade.original.jpg", "natividade.regions.png", "perpetuo-socorro.color.webp", "perpetuo-socorro.data.json", "perpetuo-socorro.line.webp", "perpetuo-socorro.original.jpg", "perpetuo-socorro.regions.png", "ressurreicao.color.webp", "ressurreicao.data.json", "ressurreicao.line.webp", "ressurreicao.original.jpg", "ressurreicao.regions.png", "sagrado-coracao.color.webp", "sagrado-coracao.data.json", "sagrado-coracao.line.webp", "sagrado-coracao.original.jpg", "sagrado-coracao.regions.png", "style.css", "index.html"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => hit)));
});
