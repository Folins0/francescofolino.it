"use client";

/**
 * Helper lato browser per registrare il service worker e attivare le
 * notifiche push. Richiede HTTPS (o localhost) — su iPhone serve anche che
 * il sito sia stato aggiunto alla schermata Home (vedi README).
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function pushSupportato(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function registraServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/sw.js");
}

export async function attivaNotifichePush(): Promise<
  "attivato" | "rifiutato" | "non-supportato"
> {
  if (!pushSupportato()) return "non-supportato";

  const permesso = await Notification.requestPermission();
  if (permesso !== "granted") return "rifiutato";

  const registration = await registraServiceWorker();
  await navigator.serviceWorker.ready;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY non configurata.");
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const risposta = await fetch("/api/admin/push-subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
    credentials: "same-origin",
  });

  if (!risposta.ok) {
    throw new Error("Errore salvataggio subscription sul server.");
  }

  return "attivato";
}

export async function statoSubscriptionAttuale(): Promise<PushSubscription | null> {
  if (!pushSupportato()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}
