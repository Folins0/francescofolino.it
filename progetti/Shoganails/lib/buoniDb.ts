import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, BuonoRow } from "@/types/database";
import type { BuonoConServizio } from "@/types/buoni";

/** Carica i buoni indicati e risolve il nome del servizio (per tipo="servizio"), per uso admin. */
export async function caricaBuoniById(
  supabase: SupabaseClient<Database>,
  buonoIds: string[]
): Promise<Map<string, BuonoConServizio>> {
  if (buonoIds.length === 0) return new Map();

  const { data: buoni } = await supabase.from("buoni").select("*").in("id", buonoIds);
  const serviceIds = [...new Set((buoni ?? []).map((b: BuonoRow) => b.service_id).filter(Boolean) as string[])];

  const nomeById = new Map<string, string>();
  if (serviceIds.length > 0) {
    const { data: servizi } = await supabase.from("services").select("id, nome").in("id", serviceIds);
    for (const s of servizi ?? []) nomeById.set(s.id, s.nome);
  }

  return new Map(
    (buoni ?? []).map((b: BuonoRow) => [
      b.id,
      { ...b, servizio_nome: b.service_id ? nomeById.get(b.service_id) ?? null : null },
    ])
  );
}
