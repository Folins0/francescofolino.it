import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { eliminaEvento } from "@/lib/google-calendar";

export const runtime = "nodejs";

/**
 * Marca una richiesta come "rifiutato" e libera di nuovo lo slot (torna
 * "libero", prenotabile da un'altra cliente). Nessun messaggio automatico
 * viene inviato.
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

  const { data: prenotazionePrima } = await supabase
    .from("booking_requests")
    .select("google_event_id")
    .eq("id", body.bookingId)
    .maybeSingle();

  const { error: bookingErr } = await supabase
    .from("booking_requests")
    .update({ stato: "rifiutato" })
    .eq("id", body.bookingId);

  if (bookingErr) {
    return NextResponse.json({ ok: false, error: bookingErr.message }, { status: 500 });
  }

  const { error: slotErr } = await supabase
    .from("available_slots")
    .update({ stato: "libero" })
    .eq("id", body.slotId);

  if (slotErr) {
    return NextResponse.json({ ok: false, error: slotErr.message }, { status: 500 });
  }

  if (prenotazionePrima?.google_event_id) {
    try {
      await eliminaEvento(prenotazionePrima.google_event_id);
    } catch (err) {
      console.error("Errore eliminazione evento Google Calendar:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
