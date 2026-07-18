import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { currentWeekRange, nextWeekRange, oggiISO } from "@/lib/week";
import { BookingForm } from "@/components/BookingForm";
import type { AvailableSlotRow, ServiceRow } from "@/types/database";

export const dynamic = "force-dynamic"; // gli slot cambiano di continuo, niente cache

async function getSlotsSettimana(
  supabase: ReturnType<typeof createClient>,
  range: { data_inizio: string; data_fine: string }
): Promise<{ pubblicata: boolean; slots: AvailableSlotRow[] }> {
  const { data: week, error: weekError } = await supabase
    .from("weeks")
    .select("id")
    .eq("data_inizio", range.data_inizio)
    .eq("data_fine", range.data_fine)
    .eq("stato", "pubblicata")
    .maybeSingle();

  if (weekError) throw weekError;
  if (!week) return { pubblicata: false, slots: [] };

  const { data: slots, error: slotsError } = await supabase
    .from("available_slots")
    .select("*")
    .eq("week_id", week.id)
    .eq("stato", "libero")
    .gte("giorno", oggiISO())
    .order("giorno", { ascending: true })
    .order("ora_inizio", { ascending: true });

  if (slotsError) throw slotsError;

  return { pubblicata: true, slots: slots ?? [] };
}

async function getDatiPrenotazione(): Promise<{
  slots: AvailableSlotRow[];
  servizi: ServiceRow[];
  settimanaCorrentePubblicata: boolean;
  settimanaProssimaPubblicata: boolean;
  errore: string | null;
}> {
  try {
    const supabase = createClient();

    const [corrente, prossima, { data: servizi, error: serviziError }] = await Promise.all([
      getSlotsSettimana(supabase, currentWeekRange()),
      getSlotsSettimana(supabase, nextWeekRange()),
      supabase.from("services").select("*").order("ordine_visualizzazione", { ascending: true }),
    ]);

    if (serviziError) throw serviziError;

    return {
      slots: [...corrente.slots, ...prossima.slots],
      servizi: servizi ?? [],
      settimanaCorrentePubblicata: corrente.pubblicata,
      settimanaProssimaPubblicata: prossima.pubblicata,
      errore: null,
    };
  } catch (err) {
    console.error("Errore caricamento dati prenotazione:", err);
    return {
      slots: [],
      servizi: [],
      settimanaCorrentePubblicata: false,
      settimanaProssimaPubblicata: false,
      errore: "Non riusciamo a caricare gli orari disponibili in questo momento. Riprova tra poco.",
    };
  }
}

export default async function PrenotaPage() {
  const {
    slots,
    servizi,
    settimanaCorrentePubblicata,
    settimanaProssimaPubblicata,
    errore,
  } = await getDatiPrenotazione();

  const messaggioProssimaSettimana = settimanaProssimaPubblicata
    ? null
    : "I turni per la settimana prossima arriveranno presto.";

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
          Invia una richiesta per uno degli orari liberi di questa settimana.
          Ti contatteremo su WhatsApp per confermare.
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
              {settimanaCorrentePubblicata
                ? "Non ci sono più orari liberi per questa settimana e per quella prossima."
                : "Gli orari di questa settimana non sono ancora disponibili."}
            </p>
            <p className="mt-2 text-sm text-stone-500">
              {settimanaCorrentePubblicata
                ? "Ricontrolla tra qualche giorno, potrebbero liberarsi nuovi orari."
                : "Ricontrolla più tardi — di solito vengono pubblicati il giovedì."}
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-coral-700 to-rose-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md"
            >
              Torna alla home
            </Link>
          </div>
        ) : (
          <>
            {messaggioProssimaSettimana && (
              <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {messaggioProssimaSettimana}
              </p>
            )}
            <BookingForm slots={slots} servizi={servizi} />
          </>
        )}
      </div>
    </main>
  );
}
