import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { creaEvento } from "@/lib/google-calendar";

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

  // Sincronizza con Google Calendar (best-effort: se fallisce, la
  // prenotazione resta comunque confermata su Supabase, che e' la fonte di
  // verita'; la mancata sincronizzazione non blocca la conferma).
  try {
    const [{ data: booking }, { data: slot }] = await Promise.all([
      supabase.from("booking_requests").select("*").eq("id", body.bookingId).single(),
      supabase.from("available_slots").select("*").eq("id", body.slotId).single(),
    ]);

    if (booking && slot) {
      const { data: servizio } = await supabase
        .from("services")
        .select("nome")
        .eq("id", booking.service_id)
        .maybeSingle();

      const eventId = await creaEvento({
        giorno: slot.giorno,
        oraInizio: slot.ora_inizio,
        oraFine: slot.ora_fine,
        titolo: `${booking.nome_cliente} — ${servizio?.nome ?? "Shoganails"}`,
        descrizione: `Tel: ${booking.telefono_cliente}${booking.note ? `\nNote: ${booking.note}` : ""}`,
      });

      await supabase
        .from("booking_requests")
        .update({ google_event_id: eventId })
        .eq("id", body.bookingId);
    }
  } catch (err) {
    console.error("Errore sincronizzazione Google Calendar:", err);
  }

  return NextResponse.json({ ok: true });
}
