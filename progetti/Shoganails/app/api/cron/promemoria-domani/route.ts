import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviaPushATutteLeSubscription } from "@/lib/push";
import { domaniISO } from "@/lib/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Chiamata una volta al giorno da Vercel Cron (vedi vercel.json). Se ci sono
 * appuntamenti confermati per domani, manda una notifica push a Grazia per
 * ricordarle di mandare i promemoria WhatsApp dal Calendario — l'invio vero
 * resta comunque manuale (bottone "Ricorda appuntamento su WhatsApp").
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Non autorizzato." }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const domani = domaniISO();

  const { data: slots, error: slotsErr } = await supabase
    .from("available_slots")
    .select("id")
    .eq("stato", "confermato")
    .eq("giorno", domani);

  if (slotsErr) {
    return NextResponse.json({ ok: false, error: slotsErr.message }, { status: 500 });
  }

  const slotIds = (slots ?? []).map((s) => s.id);
  if (slotIds.length === 0) {
    return NextResponse.json({ ok: true, appuntamenti: 0, inviate: 0 });
  }

  const { data: prenotazioni, error: prenotazioniErr } = await supabase
    .from("booking_requests")
    .select("nome_cliente")
    .in("slot_id", slotIds)
    .eq("stato", "confermato");

  if (prenotazioniErr) {
    return NextResponse.json({ ok: false, error: prenotazioniErr.message }, { status: 500 });
  }

  const n = prenotazioni?.length ?? 0;
  if (n === 0) {
    return NextResponse.json({ ok: true, appuntamenti: 0, inviate: 0 });
  }

  const nomi = (prenotazioni ?? []).map((p) => p.nome_cliente).slice(0, 3).join(", ");
  const body =
    n === 1
      ? `Domani hai l'appuntamento di ${nomi}. Ricordati di mandarle il promemoria WhatsApp.`
      : `Domani hai ${n} appuntamenti (${nomi}${n > 3 ? ", …" : ""}). Ricordati di mandare i promemoria WhatsApp.`;

  const risultato = await inviaPushATutteLeSubscription({
    title: "Promemoria da mandare",
    body,
    url: "/admin/calendario",
  });

  return NextResponse.json({ ok: true, appuntamenti: n, ...risultato });
}
