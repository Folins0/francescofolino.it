import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { weekRangeFromDate } from "@/lib/week";
import { getOrCreateWeek } from "@/lib/weekDb";

export const runtime = "nodejs";

/**
 * Trova o crea la week della settimana scelta dall'admin (qualsiasi, a
 * piacimento), senza passare per la lettura IA. Usata quando l'admin sceglie
 * di correggere tutto a mano (es. dopo un errore dell'IA senza che la week
 * sia già stata creata).
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Non autenticato." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { dataInizio?: string };
  if (!body.dataInizio || !/^\d{4}-\d{2}-\d{2}$/.test(body.dataInizio)) {
    return NextResponse.json({ ok: false, error: "Settimana non valida." }, { status: 400 });
  }

  const result = await getOrCreateWeek(supabase, weekRangeFromDate(body.dataInizio));
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, weekId: result.weekId });
}
