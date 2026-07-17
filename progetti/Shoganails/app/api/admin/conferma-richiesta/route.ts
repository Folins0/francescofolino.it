import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Marca una richiesta come "confermato" e il relativo slot come "confermato".
 * Nessun messaggio automatico viene inviato: la conferma vera con la cliente
 * avviene su WhatsApp, gestita a mano da Grazia. Questo bottone aggiorna solo
 * lo stato nel database.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Non autenticato." }, { status: 401 });
  }

  let body: { bookingId?: string; slotId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  if (!body.bookingId || !body.slotId) {
    return NextResponse.json({ ok: false, error: "Dati mancanti." }, { status: 400 });
  }

  const { error: bookingErr } = await supabase
    .from("booking_requests")
    .update({ stato: "confermato" })
    .eq("id", body.bookingId);

  if (bookingErr) {
    return NextResponse.json({ ok: false, error: bookingErr.message }, { status: 500 });
  }

  const { error: slotErr } = await supabase
    .from("available_slots")
    .update({ stato: "confermato" })
    .eq("id", body.slotId);

  if (slotErr) {
    return NextResponse.json({ ok: false, error: slotErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
