import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { linkWhatsapp } from "@/lib/whatsapp";

export const runtime = "nodejs";

const PREPARAZIONE_UNGHIE = `Per permettermi di lavorare al meglio e garantire una buona durata del trattamento, ti chiedo di:

• Non applicare creme, oli o olio per cuticole sulle mani e sulle unghie dal giorno prima.
• Non tagliare o sistemare le cuticole e non limare le unghie autonomamente.
• Se hai smalto normale, ricordati di rimuoverlo prima dell'appuntamento.
• Non applicare altri prodotti sulle unghie prima di venire.
• Evitare, per quanto possibile, di stressare o danneggiare le unghie prima del trattamento.

💗 La preparazione delle unghie verrà effettuata direttamente durante l'appuntamento.`;

/**
 * Costruisce il link wa.me per il messaggio di conferma/promemoria,
 * includendo l'indirizzo dello studio (STUDIO_INDIRIZZO, solo env var
 * server-side) e il link Google Maps. Passa da qui — invece che costruire
 * il messaggio nel componente client — così l'indirizzo non finisce mai nel
 * bundle JS del browser (vedi README, "Note sulla sicurezza dei dati").
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Non autenticato." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const telefono = searchParams.get("telefono") ?? "";
  const nome = searchParams.get("nome") ?? "";
  const servizio = searchParams.get("servizio") || "il trattamento";
  const quando = searchParams.get("quando") ?? "";

  if (!telefono || (tipo !== "conferma" && tipo !== "promemoria")) {
    return NextResponse.json({ ok: false, error: "Parametri mancanti o non validi." }, { status: 400 });
  }

  const indirizzo = process.env.STUDIO_INDIRIZZO?.trim();
  const mappa = indirizzo
    ? `\n\n📍 ${indirizzo}\nhttps://www.google.com/maps/search/?api=1&query=${encodeURIComponent(indirizzo)}`
    : "";

  const testo =
    tipo === "conferma"
      ? `Ciao ${nome}! Confermo il tuo appuntamento da Shoganails per ${servizio}, ${quando}.${mappa}\n\nA presto! 💅`
      : `Ciao ${nome}! Ti ricordiamo il tuo appuntamento da Shoganails domani alle ${quando} per ${servizio}.${mappa}\n\n${PREPARAZIONE_UNGHIE}\n\nTi aspetto! ✨\nShoganails 💅🏻`;

  return NextResponse.json({ ok: true, url: linkWhatsapp(telefono, testo) });
}
