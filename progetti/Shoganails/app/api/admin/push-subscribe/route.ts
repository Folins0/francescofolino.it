import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Salva la subscription Web Push del browser di Grazia. Richiede sessione
 * admin autenticata (cookie inviato automaticamente, same-origin): solo lei
 * può registrare un dispositivo per ricevere le notifiche.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Non autenticato." }, { status: 401 });
  }

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const endpoint = body.endpoint;
  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ ok: false, error: "Subscription non valida." }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get("user-agent") ?? null,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("Errore salvataggio push subscription:", error);
    return NextResponse.json({ ok: false, error: "Errore salvataggio." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
