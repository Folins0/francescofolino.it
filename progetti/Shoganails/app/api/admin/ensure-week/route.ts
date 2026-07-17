import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentWeek } from "@/lib/weekDb";

export const runtime = "nodejs";

/**
 * Trova o crea la week della settimana corrente, senza passare per la
 * lettura IA. Usata quando l'admin sceglie di correggere tutto a mano
 * (es. dopo un errore dell'IA senza che la week sia già stata creata).
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Non autenticato." }, { status: 401 });
  }

  const result = await getOrCreateCurrentWeek(supabase);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, weekId: result.weekId });
}
