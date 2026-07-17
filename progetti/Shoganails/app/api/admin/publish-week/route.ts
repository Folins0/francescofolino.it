import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toMinuti } from "@/lib/shifts";
import { nomeGiorno } from "@/lib/week";
import type { PublishWeekPayload } from "@/types/shifts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Non autenticato." }, { status: 401 });
  }

  let body: PublishWeekPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  if (!body.weekId || !Array.isArray(body.giorni)) {
    return NextResponse.json({ ok: false, error: "Dati mancanti." }, { status: 400 });
  }

  // Validazione: nessun turno "a chiusura" senza orario inserito.
  for (const giorno of body.giorni) {
    for (const turno of giorno.turni) {
      if (turno.nota_chiusura && toMinuti(turno.fine) === null) {
        return NextResponse.json(
          {
            ok: false,
            error: `${nomeGiorno(giorno.data) || giorno.data}: manca l'orario di chiusura per un turno "a chiusura".`,
          },
          { status: 400 }
        );
      }
    }
  }

  // Prepara le righe available_slots da inserire, scartando fasce non valide.
  const righeSlot: {
    week_id: string;
    giorno: string;
    ora_inizio: string;
    ora_fine: string;
    stato: "libero";
  }[] = [];

  for (const giorno of body.giorni) {
    if (!giorno.data) continue;
    for (const fascia of giorno.fasce_libere) {
      const ini = toMinuti(fascia.inizio);
      const fin = toMinuti(fascia.fine);
      if (ini === null || fin === null || fin <= ini) continue;
      righeSlot.push({
        week_id: body.weekId,
        giorno: giorno.data,
        ora_inizio: fascia.inizio,
        ora_fine: fascia.fine,
        stato: "libero",
      });
    }
  }

  if (righeSlot.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Nessuna fascia libera valida da pubblicare: controlla gli orari inseriti." },
      { status: 400 }
    );
  }

  // Ripubblicazione idempotente: rimuove gli slot precedenti di questa week
  // (solo quelli ancora "libero", per non cancellare richieste/conferme in corso).
  const { error: deleteErr } = await supabase
    .from("available_slots")
    .delete()
    .eq("week_id", body.weekId)
    .eq("stato", "libero");

  if (deleteErr) {
    return NextResponse.json(
      { ok: false, error: `Errore nel ripubblicare gli slot: ${deleteErr.message}` },
      { status: 500 }
    );
  }

  const { error: insertErr } = await supabase.from("available_slots").insert(righeSlot);
  if (insertErr) {
    return NextResponse.json(
      { ok: false, error: `Errore nel salvataggio degli orari liberi: ${insertErr.message}` },
      { status: 500 }
    );
  }

  const { error: weekUpdateErr } = await supabase
    .from("weeks")
    .update({ stato: "pubblicata" })
    .eq("id", body.weekId);

  if (weekUpdateErr) {
    return NextResponse.json(
      { ok: false, error: `Slot salvati, ma errore nel marcare la settimana come pubblicata: ${weekUpdateErr.message}` },
      { status: 500 }
    );
  }

  if (body.shiftUploadId) {
    await supabase
      .from("shift_uploads")
      .update({ confermato: true })
      .eq("id", body.shiftUploadId);
  }

  return NextResponse.json({ ok: true, slotPubblicati: righeSlot.length });
}
