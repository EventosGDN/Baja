self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('baja-v1').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/main.js',
        '/estilos.css',
        '/manifest.json',
        '/imagenes/192.png',
        '/imagenes/512.png'
      ]);
    })
  );
});
