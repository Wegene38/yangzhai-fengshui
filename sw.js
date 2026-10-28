/* ========== 阳宅风水 · Service Worker(离线缓存) ========== */
const CACHE = 'yangzhai-v4';
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

// 图标等静态资源:缓存优先
const CACHE_FIRST = /\.(png|svg|jpg|jpeg|webp|ico|webmanifest)$/i;

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

// 页面/样式/脚本:网络优先(保证每次访问都是最新),断网回退缓存;
// 图标/图片:缓存优先。彻底避免「新 HTML 配旧 CSS」的错配。
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  if (CACHE_FIRST.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
      )
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(hit => {
          if (hit) return hit;
          if (e.request.mode === 'navigation') return caches.match('./index.html');
          return Response.error();
        })
      )
  );
});
