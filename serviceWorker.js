self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('baja-v1').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/main.js',
        '/estilos.css',
        '/manifest.json',
        '/imagenes/logo.png'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
