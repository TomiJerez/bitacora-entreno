/* Service worker minimalista: cachea el shell de la app para uso offline. */
var CACHE_NAME = 'bitacora-v3';

/* Sin esto la app no arranca: si algo de acá falla, el SW no se instala. */
var CORE = ['./', './index.html', './manifest.json', './fonts.css'];

/* Mejora la experiencia pero no es crítico: se cachea best-effort. */
var ASSETS = [
  './icon-192.png',
  './icon-512.png',
  './fonts/Oswald-500-latin.woff2',
  './fonts/Oswald-600-latin.woff2',
  './fonts/Oswald-700-latin.woff2',
  './fonts/Manrope-400-latin.woff2',
  './fonts/Manrope-500-latin.woff2',
  './fonts/Manrope-600-latin.woff2',
  './fonts/Manrope-700-latin.woff2',
  './fonts/Manrope-800-latin.woff2',
  './fonts/IBMPlexMono-500-latin.woff2',
  './fonts/IBMPlexMono-600-latin.woff2'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE).then(function(){
        // Un ícono o una fuente que falle no debe abortar la instalación.
        return Promise.all(ASSETS.map(function(url){
          return cache.add(url).catch(function(){});
        }));
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function(cached){
      var network = fetch(event.request).then(function(resp){
        if(resp && resp.status === 200){
          var copy = resp.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return resp;
      }).catch(function(){ return cached || caches.match('./index.html'); });
      return cached || network;
    })
  );
});
