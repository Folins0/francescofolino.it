import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { currentWeekRange } from "@/lib/week";
import { BookingForm } from "@/components/BookingForm";
import type { AvailableSlotRow, ServiceRow } from "@/types/database";

export const dynamic = "force-dynamic"; // gli slot cambiano di continuo, niente cache

async function getDatiPrenotazione(): Promise<{
  slots: AvailableSlotRow[];
  servizi: ServiceRow[];
  errore: string | null;
}> {
  try {
    const supabase = createClient();
    const { data_inizio, data_fine } = currentWeekRange();

    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select("*")
      .eq("data_inizio", data_inizio)
      .eq("data_fine", data_fine)
      .eq("stato", "pubblicata")
      .maybeSingle();

    if (weekError) throw weekError;

    if (!week) {
      return { slots: [], servizi: [], errore: null };
    }

    const [{ data: slots, error: slotsError }, { data: servizi, error: serviziError }] =
      await Promise.all([
        supabase
          .from("available_slots")
          .select("*")
          .eq("week_id", week.id)
          .eq("stato", "libero")
          .order("giorno", { ascending: true })
          .order("ora_inizio", { ascending: true }),
        supabase.from("services").select("*").order("ordine_visualizzazione", { ascending: true }),
      ]);

    if (slotsError) throw slotsError;
    if (serviziError) throw serviziError;

    return { slots: slots ?? [], servizi: servizi ?? [], errore: null };
  } catch (err) {
    console.error("Errore caricamento dati prenotazione:", err);
    return {
      slots: [],
      servizi: [],
      errore: "Non riusciamo a caricare gli orari disponibili in questo momento. Riprova tra poco.",
    };
  }
}

export default async function PrenotaPage() {
  const { slots, servizi, errore } = await getDatiPrenotazione();

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
              Gli orari di questa settimana non sono ancora disponibili.
            </p>
            <p className="mt-2 text-sm text-stone-500">
              Ricontrolla più tardi — di solito vengono pubblicati il
              giovedì.
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
