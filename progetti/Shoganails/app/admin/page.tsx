import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { NuovaSettimana } from "@/components/admin/NuovaSettimana";
import { Richieste } from "@/components/admin/Richieste";
import { Galleria } from "@/components/admin/Galleria";
import { Calendario } from "@/components/admin/Calendario";
import type { AvailableSlotRow, BookingRequestRow, ServiceRow } from "@/types/database";
import type { BookingRequestConDettagli } from "@/components/admin/Richieste";
import type { GalleryPhoto } from "@/types/gallery";

async function getGalleria(
  supabase: ReturnType<typeof createClient>
): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, storage_path")
    .order("ordine", { ascending: true });

  if (error || !data) return [];

  return data.map((riga) => ({
    id: riga.id,
    url: supabase.storage.from("galleria").getPublicUrl(riga.storage_path).data
      .publicUrl,
  }));
}

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
  const serviceIds = [...new Set(richieste.map((r: BookingRequestRow) => r.service_id))];

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
    })),
    errore: null,
  };
}

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

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { richieste: richiesteIniziali, errore: erroreRichieste } = await getRichiesteInAttesa(supabase);
  const fotoGalleria = await getGalleria(supabase);
  const { data: servizi } = await supabase
    .from("services")
    .select("*")
    .order("ordine_visualizzazione", { ascending: true });
  const prenotazioniConfermate = await getPrenotazioniConfermate(supabase, servizi ?? []);

  return (
    <div className="min-h-screen bg-marble-50">
      <AdminHeader email={user?.email ?? null} />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
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

        <section className="mt-10">
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

        <section className="mt-10">
          <h2 className="font-display text-xl text-stone-800">
            Nuova settimana
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Carica la foto del foglio turni per generare gli orari liberi
            della settimana corrente.
          </p>
          <div className="mt-4">
            <NuovaSettimana />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl text-stone-800">
            Foto del sito
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Le foto qui sotto sono quelle che le clienti vedono nella sezione
            &quot;Le nostre unghie&quot; della home page.
          </p>
          <div className="mt-4">
            <Galleria fotoIniziali={fotoGalleria} />
          </div>
        </section>
      </main>
    </div>
  );
}
