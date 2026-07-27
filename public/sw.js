/*
 * Service worker kokpitu.
 *
 * Świadomie NIE cache'ujemy stron aplikacji — zawierają dane po zalogowaniu,
 * a zapisany w cache HTML mógłby zostać pokazany innej osobie na tym samym
 * urządzeniu albo po wylogowaniu. Cache'ujemy wyłącznie statyczne zasoby
 * builda i pokazujemy stronę zastępczą, gdy nie ma sieci.
 */

const VERSION = "kokpit-v1";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Zasoby builda są niezmienne i nie zawierają danych użytkownika.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Nawigacje: zawsze z sieci, a przy jej braku strona zastępcza.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  }
});
