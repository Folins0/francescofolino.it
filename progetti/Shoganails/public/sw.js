// Service worker Shoganails — gestisce le notifiche Web Push per il pannello
// admin, anche quando l'app NON è aperta in primo piano (richiede che il sito
// sia stato installato come PWA sul telefono, vedi README).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let dati = { title: "Shoganails", body: "Hai una nuova notifica", url: "/admin" };

  if (event.data) {
    try {
      dati = { ...dati, ...event.data.json() };
    } catch {
      dati.body = event.data.text();
    }
  }

  const opzioni = {
    body: dati.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: dati.url || "/admin" },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(dati.title, opzioni));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
