/*
 * MSS service worker: installable PWA + offline fallback for the kiosk.
 *
 * Strategy:
 *  - navigations and calendar data (ICS/JSON): network-first, cache fallback
 *    so the calendar always shows the freshest data when online and still
 *    works offline
 *  - other same-origin GETs (hashed app assets, images): cache-first
 *  - cross-origin requests (un images, fonts): untouched
 */

const CACHE_VERSION = "mss-v1";
const PRECACHE = ["/", "/index.html", "/mss-events.html", "/MSS.ics"];

const isFreshFirst = (url) =>
  url.pathname === "/" ||
  url.pathname.endsWith(".html") ||
  url.pathname.endsWith(".ics") ||
  url.pathname.endsWith(".json");

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // Individual failures must not abort the install.
      await Promise.all(
        PRECACHE.map(async (item) => {
          try {
            const response = await fetch(item);
            if (response && (response.ok || response.redirected)) {
              await cache.put(item, response);
            }
          } catch {
            /* offline install: runtime cache fills the gaps */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  const freshFirst = isFreshFirst(url) || request.mode === "navigate";
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      if (freshFirst) {
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.ok) {
            await cache.put(request, fresh.clone());
          }
          return fresh;
        } catch (error) {
          const cached =
            (await cache.match(request)) || (await cache.match("/index.html"));
          if (cached) {
            return cached;
          }
          throw error;
        }
      }
      const cached = await cache.match(request);
      const fresh = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || fresh;
    })(),
  );
});
