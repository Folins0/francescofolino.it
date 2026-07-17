import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Helper server-only per l'invio delle notifiche Web Push a Grazia. Va
 * importato solo da Route Handler (mai da codice client).
 */

let vapidConfigured = false;

function configuraVapid() {
  if (vapidConfigured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:info@shoganails.example";

  if (!publicKey || !privateKey) {
    throw new Error(
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY mancanti. Generale con " +
        "`npm run generate-vapid-keys` e aggiungile a .env.local (vedi README)."
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Invia una notifica push a TUTTE le subscription salvate (in pratica: il/i
 * browser di Grazia con l'app installata come PWA). Se una subscription
 * risulta scaduta/non valida (404/410), viene rimossa dal DB.
 */
export async function inviaPushATutteLeSubscription(payload: PushPayload) {
  configuraVapid();

  const supabase = createAdminClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (error) {
    console.error("Errore lettura push_subscriptions:", error);
    return { inviate: 0, fallite: 0 };
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { inviate: 0, fallite: 0 };
  }

  const payloadJson = JSON.stringify(payload);
  let inviate = 0;
  let fallite = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadJson
        );
        inviate += 1;
      } catch (err: unknown) {
        fallite += 1;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Errore invio push:", err);
        }
      }
    })
  );

  return { inviate, fallite };
}
