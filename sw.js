// ================================================================
// SERVICE WORKER — Llanea PWA
// El service worker es un script que el navegador ejecuta en
// segundo plano, separado de la página web. Intercepta las
// peticiones de red y puede responder desde caché, lo que
// permite que la app funcione SIN conexión a internet.
// ================================================================

// ── NOMBRE Y VERSIÓN DEL CACHÉ ──────────────────────────────────
// Cambiar este nombre al actualizar la app fuerza al SW a
// descartar el caché viejo y crear uno nuevo.
const CACHE_NAME = 'llanea-v1';

// ── ARCHIVOS A CACHEAR ──────────────────────────────────────────
// Lista de recursos que se guardan en caché durante la
// instalación. Con esto, la app carga aunque no haya internet.
const ARCHIVOS_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── EVENTO: INSTALL ─────────────────────────────────────────────
// Se dispara la primera vez que el navegador registra el SW.
// Aquí descargamos y guardamos los archivos en caché.
self.addEventListener('install', (event) => {
  console.log('[SW Llanea] Instalando...');

  event.waitUntil(
    caches.open(CACHE_NAME)                  // abre (o crea) el caché
      .then(cache => {
        console.log('[SW Llanea] Cacheando archivos...');
        return cache.addAll(ARCHIVOS_CACHE); // descarga y guarda todos
      })
      .then(() => self.skipWaiting())        // activa el SW inmediatamente
  );
});

// ── EVENTO: ACTIVATE ────────────────────────────────────────────
// Se dispara cuando el SW toma el control. Aquí eliminamos
// cachés de versiones anteriores para no desperdiciar espacio.
self.addEventListener('activate', (event) => {
  console.log('[SW Llanea] Activado');

  event.waitUntil(
    caches.keys().then(claves => {
      return Promise.all(
        claves
          .filter(clave => clave !== CACHE_NAME) // todas menos la actual
          .map(clave => {
            console.log('[SW Llanea] Eliminando caché viejo:', clave);
            return caches.delete(clave);
          })
      );
    }).then(() => self.clients.claim()) // toma control de todas las pestañas
  );
});

// ── EVENTO: FETCH ───────────────────────────────────────────────
// Se dispara cada vez que la app hace una petición de red
// (cargar página, imagen, CSS, etc.).
// Estrategia: Cache First — busca en caché primero;
// si no está, va a la red y guarda la respuesta para la próxima vez.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)       // ¿está en caché?
      .then(respuestaCacheada => {

        if (respuestaCacheada) {
          // ✅ Encontrado en caché — responde sin usar la red
          return respuestaCacheada;
        }

        // ❌ No está en caché — va a la red
        return fetch(event.request)
          .then(respuestaRed => {

            // Solo cacheamos respuestas válidas (código 200, tipo básico)
            if (
              !respuestaRed ||
              respuestaRed.status !== 200 ||
              respuestaRed.type !== 'basic'
            ) {
              return respuestaRed;
            }

            // Clonamos la respuesta porque se puede leer solo una vez:
            // una copia va al caché y la otra al navegador
            const copiaParaCache = respuestaRed.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, copiaParaCache);
            });

            return respuestaRed;
          })
          .catch(() => {
            // Sin conexión y sin caché: mostramos la página principal
            return caches.match('./index.html');
          });
      })
  );
});
