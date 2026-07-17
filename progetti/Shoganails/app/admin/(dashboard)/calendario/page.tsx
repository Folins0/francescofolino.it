import { createClient } from "@/lib/supabase/server";
import { Calendario } from "@/components/admin/Calendario";
import type { AvailableSlotRow, BookingRequestRow, ServiceRow } from "@/types/database";
import type { BookingRequestConDettagli } from "@/components/admin/Richieste";

async function getPrenotazioniConfermate(
  supabase: ReturnType<typeof createClient>,
  servizi: ServiceRow[]
): Promise<BookingRequestConDettagli[]> {
  const oggi = new Date().toISOString().slice(0, 10);

  const { data: slots, error } = await supabase
    .from("available_slots")
    .select("*")
    .eq("stato", "confermato")
    .gte("giorno", oggi);

  if (error || !slots || slots.length === 0) return [];

  const slotIds = slots.map((s: AvailableSlotRow) => s.id);
  const { data: prenotazioni } = await supabase
    .from("booking_requests")
    .select("*")
    .in("slot_id", slotIds)
    .eq("stato", "confermato");

  const slotById = new Map<string, AvailableSlotRow>(slots.map((s: AvailableSlotRow) => [s.id, s]));
  const servizioById = new Map<string, ServiceRow>(servizi.map((s) => [s.id, s]));

  return (prenotazioni ?? []).map((p: BookingRequestRow) => ({
    ...p,
    slot: slotById.get(p.slot_id) ?? null,
    service: servizioById.get(p.service_id) ?? null,
  }));
}

export default async function CalendarioPage() {
  const supabase = createClient();
  const { data: servizi } = await supabase
    .from("services")
    .select("*")
    .order("ordine_visualizzazione", { ascending: true });
  const prenotazioniConfermate = await getPrenotazioniConfermate(supabase, servizi ?? []);

  return (
    <section>
      <h2 className="font-display text-xl text-stone-800">Calendario</h2>
      <p className="mt-1 text-sm text-stone-500">
        Prenotazioni confermate, da oggi in poi. Modifica o cancella un
        appuntamento se cambia qualcosa.
      </p>
      <div className="mt-4">
        <Calendario
          prenotazioniIniziali={prenotazioniConfermate}
          servizi={servizi ?? []}
        />
      </div>
    </section>
  );
}
