import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aggiornaEvento, creaEvento } from "@/lib/google-calendar";

export const runtime = "nodejs";

interface ModificaPrenotazionePayload {
  bookingId?: string;
  slotId?: string;
  nomeCliente?: string;
  telefonoCliente?: string;
  serviceId?: string;
  note?: string;
  giorno?: string;
  oraInizio?: string;
  oraFine?: string;
}

/**
 * Modifica una prenotazione già confermata: dati cliente/servizio/note sulla
 * booking_request, giorno/orario sullo slot collegato. Nessun messaggio
 * automatico viene inviato alla cliente.
 */
export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Non autenticato." }, { status: 401 });
  }

  let body: ModificaPrenotazionePayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const {
    bookingId,
    slotId,
    nomeCliente,
    telefonoCliente,
    serviceId,
    note,
    giorno,
    oraInizio,
    oraFine,
  } = body;

  if (
    !bookingId ||
    !slotId ||
    !nomeCliente ||
    !telefonoCliente ||
    !serviceId ||
    !giorno ||
    !oraInizio ||
    !oraFine
  ) {
    return NextResponse.json({ ok: false, error: "Dati mancanti." }, { status: 400 });
  }

  if (oraFine <= oraInizio) {
    return NextResponse.json(
      { ok: false, error: "L'orario di fine deve essere dopo l'orario di inizio." },
      { status: 400 }
    );
  }

  const { data: prenotazionePrima } = await supabase
    .from("booking_requests")
    .select("google_event_id")
    .eq("id", bookingId)
    .maybeSingle();

  const { error: bookingErr } = await supabase
    .from("booking_requests")
    .update({
      nome_cliente: nomeCliente,
      telefono_cliente: telefonoCliente,
      service_id: serviceId,
      note: note || null,
    })
    .eq("id", bookingId);

  if (bookingErr) {
    return NextResponse.json({ ok: false, error: bookingErr.message }, { status: 500 });
  }

  const { error: slotErr } = await supabase
    .from("available_slots")
    .update({ giorno, ora_inizio: oraInizio, ora_fine: oraFine })
    .eq("id", slotId);

  if (slotErr) {
    return NextResponse.json({ ok: false, error: slotErr.message }, { status: 500 });
  }

  // Sincronizza con Google Calendar (best-effort: vedi conferma-richiesta).
  try {
    const { data: servizio } = await supabase
      .from("services")
      .select("nome")
      .eq("id", serviceId)
      .maybeSingle();

    const datiEvento = {
      giorno,
      oraInizio,
      oraFine,
      titolo: `${nomeCliente} — ${servizio?.nome ?? "Shoganails"}`,
      descrizione: `Tel: ${telefonoCliente}${note ? `\nNote: ${note}` : ""}`,
    };

    if (prenotazionePrima?.google_event_id) {
      await aggiornaEvento(prenotazionePrima.google_event_id, datiEvento);
    } else {
      const eventId = await creaEvento(datiEvento);
      await supabase.from("booking_requests").update({ google_event_id: eventId }).eq("id", bookingId);
    }
  } catch (err) {
    console.error("Errore sincronizzazione Google Calendar:", err);
  }

  return NextResponse.json({ ok: true });
}
