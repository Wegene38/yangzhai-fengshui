/* ========== 阳宅风水 · Service Worker(离线缓存) ========== */
const CACHE = 'yangzhai-v3';
const ASSETS = [
  './',
  'index.html',
  'luopan.html',
  'luantou.html',
  'xuankong.html',
  'jinsuo.html',
  'upload.html',
  'sunlight.html',
  'css/style.css',
  'css/luopan.css',
  'css/schools.css',
  'css/sunlight.css',
  'js/luopan.js',
  'js/luantou.js',
  'js/xuankong.js',
  'js/jinsuo.js',
  'js/upload.js',
  'js/sunlight.js',
  'js/install.js',
  'manifest.webmanifest',
  'icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 缓存优先,后台静默更新(stale-while-revalidate)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      const refresh = fetch(e.request)
        .then(res => {
          if (res && res.ok && new URL(e.request.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => {
          // 离线时导航请求回退到首页
          if (e.request.mode === 'navigation') return caches.match('./index.html');
          return hit;
        });
      return hit || refresh;
    })
  );
});
