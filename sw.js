/* B&D · funciona sin internet: primero la red, y si no hay, la última copia guardada.
   Las cotizaciones y tasas (otros dominios) no se guardan acá: la app ya guarda los últimos valores. */
var CACHE = 'bd-0.3.3';
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copia); }); return r;
  }).catch(function () { return caches.match(e.request); }));
});

/* avisos con la app cerrada (fase 2: el servidor de avisos, Firebase Cloud Messaging, los manda acá) */
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { titulo: e.data ? e.data.text() : 'B&D' }; }
  e.waitUntil(self.registration.showNotification('B&D · ' + (d.titulo || 'Aviso'), { body: d.texto || 'Abrí la app para ver el detalle.', icon: 'icono-192.png', badge: 'icono-192.png', tag: d.tag || 'bd-aviso', renotify: true, silent: false, vibrate: [200, 100, 200], data: { ir: d.ir || './#/inicio' } }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(function (cs) { var ir = e.notification.data && e.notification.data.ir || './'; for (var i = 0; i < cs.length; i++) if ('focus' in cs[i]) { cs[i].navigate(ir); return cs[i].focus(); } return self.clients.openWindow(ir); }));
});
