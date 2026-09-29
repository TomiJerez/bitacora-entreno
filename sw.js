/* Service worker minimalista: cachea el shell de la app para uso offline. */
/* Tiene que coincidir con APP_VERSION en index.html. */
var CACHE_NAME = 'bitacora-v22';

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

function fresh(url){ return new Request(url, {cache:'reload'}); }

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      // cache:'reload' saltea el cache HTTP: si no, se podia guardar el index viejo
      return cache.addAll(CORE.map(fresh)).then(function(){
        // Un ícono o una fuente que falle no debe abortar la instalación.
        return Promise.all(ASSETS.map(function(url){
          return cache.add(fresh(url)).catch(function(){});
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

/* La pagina (index.html) va primero a la red, salteando el cache HTTP de
   GitHub Pages (max-age=600): asi una version nueva aparece en la proxima
   apertura. Sin señal, o si la red tarda mas de NAV_TIMEOUT_MS, sale del
   cache y la app abre igual en el gimnasio. */
var NAV_TIMEOUT_MS = 3000;

function networkFirst(request){
  return new Promise(function(resolve){
    var settled = false;
    function fromCache(){
      if(settled) return;
      settled = true;
      resolve(caches.match(request, {ignoreSearch:true}).then(function(c){
        return c || caches.match('./index.html');
      }));
    }
    var timer = setTimeout(fromCache, NAV_TIMEOUT_MS);
    fetch(request, {cache:'no-cache'}).then(function(resp){
      if(resp && resp.status === 200){
        var copy = resp.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(request, copy); });
      }
      if(settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(resp);
    }).catch(function(){ clearTimeout(timer); fromCache(); });
  });
}

self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  if(event.request.mode === 'navigate'){
    event.respondWith(networkFirst(event.request));
    return;
  }
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
