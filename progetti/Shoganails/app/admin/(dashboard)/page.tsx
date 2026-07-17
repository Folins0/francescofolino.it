import { createClient } from "@/lib/supabase/server";
import { Richieste } from "@/components/admin/Richieste";
import type { AvailableSlotRow, BookingRequestRow, ServiceRow } from "@/types/database";
import type { BookingRequestConDettagli } from "@/components/admin/Richieste";

async function getRichiesteInAttesa(
  supabase: ReturnType<typeof createClient>
): Promise<{ richieste: BookingRequestConDettagli[]; errore: string | null }> {
  const { data: richieste, error } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("stato", "in_attesa")
    .order("creato_il", { ascending: true });

  if (error) {
    console.error("Errore lettura booking_requests:", error);
    return {
      richieste: [],
      errore: "Non riesco a caricare le richieste in questo momento. Ricarica la pagina.",
    };
  }

  if (!richieste || richieste.length === 0) {
    return { richieste: [], errore: null };
  }

  const slotIds = [...new Set(richieste.map((r: BookingRequestRow) => r.slot_id))];
  const serviceIds = [
    ...new Set(
      richieste.flatMap((r: BookingRequestRow) => [r.service_id, r.service_id_extra].filter(Boolean) as string[])
    ),
  ];

  const [{ data: slots }, { data: servizi }] = await Promise.all([
    supabase.from("available_slots").select("*").in("id", slotIds),
    supabase.from("services").select("*").in("id", serviceIds),
  ]);

  const slotById = new Map<string, AvailableSlotRow>((slots ?? []).map((s) => [s.id, s]));
  const servizioById = new Map<string, ServiceRow>((servizi ?? []).map((s) => [s.id, s]));

  return {
    richieste: richieste.map((r: BookingRequestRow) => ({
      ...r,
      slot: slotById.get(r.slot_id) ?? null,
      service: servizioById.get(r.service_id) ?? null,
      serviceExtra: r.service_id_extra ? servizioById.get(r.service_id_extra) ?? null : null,
    })),
    errore: null,
  };
}

export default async function RichiestePage() {
  const supabase = createClient();
  const { richieste: richiesteIniziali, errore: erroreRichieste } =
    await getRichiesteInAttesa(supabase);

  return (
    <section>
      <h2 className="font-display text-xl text-stone-800">Richieste</h2>
      <p className="mt-1 text-sm text-stone-500">
        Nuove richieste in attesa di conferma. Contatta la cliente su
        WhatsApp, poi aggiorna lo stato qui.
      </p>
      {erroreRichieste && (
        <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {erroreRichieste}
        </p>
      )}
      <div className="mt-4">
        <Richieste richiesteIniziali={richiesteIniziali} />
      </div>
    </section>
  );
}
