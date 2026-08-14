const CACHE = 'est-db-v5';
const ASSETS = ['./', './index.html', './manifest.webmanifest',
                './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
    .then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      if (k !== CACHE) return caches.delete(k);
    }));
  }).then(function () { return self.clients.claim(); })
   .then(function () {
     // recargar las pestanas abiertas para que tomen la version nueva
     return self.clients.matchAll({ type: 'window' }).then(function (cs) {
       cs.forEach(function (c) { if (c.navigate) c.navigate(c.url); });
     });
   }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  var esApp = e.request.mode === 'navigate' ||
              /\/(index\.html)?$/.test(url.pathname);
  if (esApp) {                       // red primero, cache de respaldo
    e.respondWith(fetch(e.request).then(function (resp) {
      var copia = resp.clone();
      caches.open(CACHE).then(function (c) {
        try { c.put(e.request, copia); } catch (_) {}
      });
      return resp;
    }).catch(function () {
      return caches.match(e.request).then(function (r) {
        return r || caches.match('./index.html');
      });
    }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function (cached) {
    return cached || fetch(e.request).then(function (resp) {
      return caches.open(CACHE).then(function (c) {
        try { c.put(e.request, resp.clone()); } catch (_) {}
        return resp;
      });
    }).catch(function () { return caches.match('./index.html'); });
  }));
});
