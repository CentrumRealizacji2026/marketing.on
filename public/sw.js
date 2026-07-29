/*
 * Service worker kokpitu.
 *
 * Świadomie NIE cache'ujemy stron aplikacji — zawierają dane po zalogowaniu,
 * a zapisany w cache HTML mógłby zostać pokazany innej osobie na tym samym
 * urządzeniu albo po wylogowaniu. Cache'ujemy wyłącznie statyczne zasoby
 * builda i pokazujemy stronę zastępczą, gdy nie ma sieci.
 */

const VERSION = "kokpit-v2";
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

/*
 * Powiadomienia push: serwer wysyła JSON {title, body, url, tag}. Tag scala
 * duplikaty (np. ponowione przypomnienie o tej samej porze leków), a kliknięcie
 * skupia już otwarte okno aplikacji zamiast otwierać kolejne.
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Kokpit", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Kokpit", {
      body: data.body || "",
      tag: data.tag || undefined,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
