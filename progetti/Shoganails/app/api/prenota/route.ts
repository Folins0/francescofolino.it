import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inviaPushATutteLeSubscription } from "@/lib/push";

export const runtime = "nodejs";

interface PrenotaBody {
  slotId?: string;
  nomeCliente?: string;
  telefonoCliente?: string;
  serviceId?: string;
  orarioPreferito?: string | null;
  note?: string | null;
  // solo per comporre il testo della notifica push, non usati dal DB
  giornoLabel?: string;
  orarioLabel?: string;
  servizioLabel?: string;
}

const TELEFONO_REGEX = /^[+\d][\d\s()-]{5,20}$/;

/**
 * Crea una richiesta di prenotazione (Prompt 5) e, se riesce, avvisa Grazia
 * con una notifica push (Prompt 6). Nessun utente deve essere autenticato:
 * la chiamano le clienti dalla pagina pubblica /prenota. La sicurezza vera è
 * nella funzione Postgres `request_booking()` (security definer, vedi
 * supabase/migrations/0002_booking_and_notifications.sql), che aggiorna lo
 * slot e crea la richiesta in modo atomico.
 */
export async function POST(request: Request) {
  let body: PrenotaBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const { slotId, nomeCliente, telefonoCliente, serviceId, orarioPreferito, note } = body;

  if (!slotId || !serviceId) {
    return NextResponse.json({ ok: false, error: "Scegli un orario e un servizio." }, { status: 400 });
  }
  if (!nomeCliente || nomeCliente.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "Inserisci il tuo nome." }, { status: 400 });
  }
  if (!telefonoCliente || !TELEFONO_REGEX.test(telefonoCliente.trim())) {
    return NextResponse.json({ ok: false, error: "Numero di telefono non valido." }, { status: 400 });
  }

  const supabase = createClient();

  const { error: rpcError } = await supabase.rpc("request_booking", {
    p_slot_id: slotId,
    p_nome_cliente: nomeCliente.trim(),
    p_telefono_cliente: telefonoCliente.trim(),
    p_service_id: serviceId,
    p_orario_preferito: orarioPreferito ?? null,
    p_note: note?.trim() || null,
  });

  if (rpcError) {
    const messaggio = rpcError.message.includes("non più disponibile")
      ? "Questo orario è appena stato richiesto da un'altra cliente. Scegline un altro e riprova."
      : "Non siamo riusciti a inviare la richiesta. Riprova tra un attimo.";
    return NextResponse.json({ ok: false, error: messaggio }, { status: 409 });
  }

  // Notifica push a Grazia — best effort: se fallisce (es. non ha ancora
  // attivato le notifiche, o le chiavi VAPID non sono configurate) la
  // richiesta resta comunque salvata e visibile via Realtime nel pannello.
  try {
    const giorno = body.giornoLabel ?? "";
    const orario = body.orarioLabel ?? "";
    const servizio = body.servizioLabel ?? "";
    const dettagli = [servizio, giorno, orario].filter(Boolean).join(" · ");

    await inviaPushATutteLeSubscription({
      title: "Nuova richiesta di prenotazione",
      body: dettagli ? `${nomeCliente.trim()} — ${dettagli}` : `${nomeCliente.trim()} ha inviato una richiesta`,
      url: "/admin",
    });
  } catch (err) {
    console.error("Errore invio notifica push (richiesta comunque salvata):", err);
  }

  return NextResponse.json({ ok: true });
}
