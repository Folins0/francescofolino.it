import { createClient } from "@/lib/supabase/server";
import { Buoni } from "@/components/admin/Buoni";
import type { BuonoConServizio } from "@/types/buoni";

async function getBuoni(supabase: ReturnType<typeof createClient>): Promise<BuonoConServizio[]> {
  const { data: buoni, error } = await supabase
    .from("buoni")
    .select("*")
    .order("creato_il", { ascending: false });

  if (error || !buoni) return [];

  const serviceIds = [...new Set(buoni.map((b) => b.service_id).filter(Boolean) as string[])];
  const nomeById = new Map<string, string>();
  if (serviceIds.length > 0) {
    const { data: servizi } = await supabase.from("services").select("id, nome").in("id", serviceIds);
    for (const s of servizi ?? []) nomeById.set(s.id, s.nome);
  }

  return buoni.map((b) => ({ ...b, servizio_nome: b.service_id ? nomeById.get(b.service_id) ?? null : null }));
}

export default async function BuoniPage() {
  const supabase = createClient();
  const [buoniIniziali, { data: servizi }] = await Promise.all([
    getBuoni(supabase),
    supabase.from("services").select("*").order("ordine_visualizzazione", { ascending: true }),
  ]);

  return (
    <section>
      <h2 className="font-display text-xl text-stone-800">Buoni</h2>
      <p className="mt-1 text-sm text-stone-500">
        Crea buoni regalo (valore in CHF) o legati a un servizio specifico.
        Le clienti li inseriscono in fase di prenotazione: tu gestisci
        l&apos;applicazione dello sconto/servizio a mano, come per il resto.
      </p>
      <div className="mt-4">
        <Buoni buoniIniziali={buoniIniziali} servizi={servizi ?? []} />
      </div>
    </section>
  );
}
