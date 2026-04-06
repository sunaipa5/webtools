const CACHE_NAME = "v1";
const ASSETS = [
  "/",
  "/index.html",
  "/index.css",
  "/style.css",
  "/manifest.json",
  "/favicon.webp",
  "/icon-192.png",
  //--- Routes ---
  "/base64/",
  "/base64/index.html",
  "/iconpress/",
  "/iconpress/index.html",
  "/iconpress/jszip.min.js",
  "/sleep-calculator/",
  "/sleep-calculator/index.html",
  "/svg-opt/",
  "/svg-opt/index.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((k) => caches.delete(k)),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      const url = new URL(event.request.url);
      if (
        !url.pathname.endsWith("/") &&
        !url.pathname.split("/").pop().includes(".")
      ) {
        return caches.match(url.pathname + "/");
      }

      return fetch(event.request).catch(() => {
        console.error("Offline fallback failed.");
      });
    }),
  );
});
