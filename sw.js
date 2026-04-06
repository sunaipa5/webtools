const CACHE_NAME = "tool-cache-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/index.css",
  "/style.css",
  "/manifest.json",
  "/favicon.webp",
  "/icon-192.png",
  "/base64/index.html",
  "/iconpress/index.html",
  "/iconpress/jszip.min.js",
  "/sleep-calculator/index.html",
  "/svg-opt/index.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
    }),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    }),
  );
});
