const CACHE_NAME = "fgo-calc-v1";

// Compute base path from service worker location (works on GitHub Pages subdirs)
const BASE = new URL(".", self.location.href).pathname;

const STATIC_ASSETS = [
  BASE,
  BASE + "index.html",
  BASE + "styles.css",
  BASE + "app.js",
  BASE + "data/traits.js",
  BASE + "data/servants.js",
  BASE + "data/craft_essences.js",
  BASE + "manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Cache-first for static assets (icons, fonts, images)
  if (
    url.pathname.startsWith(BASE + "icons/") ||
    url.pathname.startsWith(BASE + "fonts/") ||
    url.pathname.startsWith(BASE + "servants/") ||
    url.pathname.startsWith(BASE + "craft_essences/")
  ) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return resp;
        });
      })
    );
    return;
  }

  // Network-first for HTML, JS, CSS, data (to get updates)
  e.respondWith(
    fetch(e.request).then((resp) => {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match(e.request))
  );
});
