import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Trova la week corrispondente al range dato o la crea (stato "bozza") se non esiste ancora. */
export async function getOrCreateWeek(
  supabase: SupabaseClient<Database>,
  range: { data_inizio: string; data_fine: string }
): Promise<{ weekId: string } | { error: string }> {
  const { data_inizio, data_fine } = range;

  const { data: esistente, error: selectErr } = await supabase
    .from("weeks")
    .select("id")
    .eq("data_inizio", data_inizio)
    .eq("data_fine", data_fine)
    .maybeSingle();

  if (selectErr) {
    return { error: `Errore database (weeks): ${selectErr.message}` };
  }
  if (esistente) {
    return { weekId: esistente.id };
  }

  const { data: nuova, error: insertErr } = await supabase
    .from("weeks")
    .insert({ data_inizio, data_fine, stato: "bozza" })
    .select("id")
    .single();

  if (insertErr || !nuova) {
    return { error: `Errore database (creazione settimana): ${insertErr?.message ?? "sconosciuto"}` };
  }

  return { weekId: nuova.id };
}
