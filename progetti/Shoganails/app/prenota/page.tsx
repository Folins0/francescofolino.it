import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { oggiISO } from "@/lib/week";
import { BookingForm } from "@/components/BookingForm";
import type { AvailableSlotRow, ServiceRow } from "@/types/database";

export const dynamic = "force-dynamic"; // gli slot cambiano di continuo, niente cache

async function getDatiPrenotazione(): Promise<{
  slots: AvailableSlotRow[];
  servizi: ServiceRow[];
  nessunaSettimanaPubblicata: boolean;
  errore: string | null;
}> {
  try {
    const supabase = createClient();
    const oggi = oggiISO();

    // Mostra gli slot di TUTTE le settimane già pubblicate dall'admin (non
    // solo corrente/prossima: l'admin può pubblicare quante settimane vuole,
    // anche più avanti nel tempo). Le settimane non ancora pubblicate non
    // compaiono mai qui.
    const [{ data: weeks, error: weeksError }, { data: servizi, error: serviziError }] =
      await Promise.all([
        supabase
          .from("weeks")
          .select("id")
          .eq("stato", "pubblicata")
          .gte("data_fine", oggi)
          .order("data_inizio", { ascending: true }),
        supabase.from("services").select("*").order("ordine_visualizzazione", { ascending: true }),
      ]);

    if (weeksError) throw weeksError;
    if (serviziError) throw serviziError;

    const weekIds = (weeks ?? []).map((w) => w.id);
    let slots: AvailableSlotRow[] = [];

    if (weekIds.length > 0) {
      const { data, error: slotsError } = await supabase
        .from("available_slots")
        .select("*")
        .in("week_id", weekIds)
        .eq("stato", "libero")
        .gte("giorno", oggi)
        .order("giorno", { ascending: true })
        .order("ora_inizio", { ascending: true });

      if (slotsError) throw slotsError;
      slots = data ?? [];
    }

    return {
      slots,
      servizi: servizi ?? [],
      nessunaSettimanaPubblicata: (weeks ?? []).length === 0,
      errore: null,
    };
  } catch (err) {
    console.error("Errore caricamento dati prenotazione:", err);
    return {
      slots: [],
      servizi: [],
      nessunaSettimanaPubblicata: true,
      errore: "Non riusciamo a caricare gli orari disponibili in questo momento. Riprova tra poco.",
    };
  }
}

export default async function PrenotaPage() {
  const { slots, servizi, nessunaSettimanaPubblicata, errore } = await getDatiPrenotazione();

  return (
    <main className="min-h-screen bg-marble-50 bg-marble-veins">
      <header className="sticky top-0 z-20 border-b border-marble-200/70 bg-marble-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-4 sm:max-w-2xl">
          <Link href="/" className="font-display text-2xl font-semibold tracking-wide text-stone-800">
            Shoganails
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 pb-16 pt-8 sm:max-w-2xl">
        <h1 className="font-display text-2xl font-semibold text-stone-800 sm:text-3xl">
          Prenota un appuntamento
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Invia una richiesta per uno degli orari liberi. Ti contatteremo su
          WhatsApp per confermare.
        </p>

        {errore ? (
          <div role="alert" className="mt-8 rounded-2xl bg-rose-50 p-6 text-center shadow-sm">
            <p className="font-medium text-rose-700">{errore}</p>
            <Link
              href="/prenota"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-coral-700 to-rose-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md"
            >
              Riprova
            </Link>
          </div>
        ) : slots.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="font-medium text-stone-700">
              {nessunaSettimanaPubblicata
                ? "Gli orari non sono ancora disponibili."
                : "Non ci sono più orari liberi al momento."}
            </p>
            <p className="mt-2 text-sm text-stone-500">
              {nessunaSettimanaPubblicata
                ? "Ricontrolla più tardi — di solito vengono pubblicati il giovedì."
                : "Ricontrolla tra qualche giorno, potrebbero liberarsi nuovi orari."}
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-coral-700 to-rose-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md"
            >
              Torna alla home
            </Link>
          </div>
        ) : (
          <BookingForm slots={slots} servizi={servizi} />
        )}
      </div>
    </main>
  );
}
