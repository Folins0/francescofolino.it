"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { attivaNotifichePush, pushSupportato, statoSubscriptionAttuale } from "@/lib/push-client";
import { formattaGiornoBreve, nomeGiorno } from "@/lib/week";
import type { AvailableSlotRow, BookingRequestRow, ServiceRow } from "@/types/database";

export interface BookingRequestConDettagli extends BookingRequestRow {
  slot?: AvailableSlotRow | null;
  service?: ServiceRow | null;
}

function formattaOra(ora: string): string {
  return ora.slice(0, 5);
}

export function Richieste({
  richiesteIniziali,
}: {
  richiesteIniziali: BookingRequestConDettagli[];
}) {
  const [richieste, setRichieste] = useState<BookingRequestConDettagli[]>(richiesteIniziali);
  const [statoPush, setStatoPush] = useState<
    "sconosciuto" | "attivo" | "non-attivo" | "non-supportato"
  >("sconosciuto");
  const [attivandoPush, setAttivandoPush] = useState(false);
  const [idInCorso, setIdInCorso] = useState<string | null>(null);
  const [erroreAzione, setErroreAzione] = useState<string | null>(null);

  // ------------------------------------------------------------
  // Realtime: nuove richieste (INSERT) e cambi di stato (UPDATE, es. da
  // un altro dispositivo) sulla tabella booking_requests.
  // ------------------------------------------------------------
  useEffect(() => {
    const supabase = createClient();

    const canale = supabase
      .channel("booking_requests_admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_requests" },
        async (payload) => {
          const nuova = payload.new as BookingRequestRow;
          if (nuova.stato !== "in_attesa") return;

          const [{ data: slot }, { data: service }] = await Promise.all([
            supabase.from("available_slots").select("*").eq("id", nuova.slot_id).maybeSingle(),
            supabase.from("services").select("*").eq("id", nuova.service_id).maybeSingle(),
          ]);

          setRichieste((prev) => {
            if (prev.some((r) => r.id === nuova.id)) return prev;
            return [...prev, { ...nuova, slot: slot ?? null, service: service ?? null }];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "booking_requests" },
        (payload) => {
          const aggiornata = payload.new as BookingRequestRow;
          setRichieste((prev) =>
            aggiornata.stato === "in_attesa"
              ? prev
              : prev.filter((r) => r.id !== aggiornata.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
  }, []);

  // ------------------------------------------------------------
  // Stato notifiche push
  // ------------------------------------------------------------
  useEffect(() => {
    if (!pushSupportato()) {
      setStatoPush("non-supportato");
      return;
    }
    statoSubscriptionAttuale().then((sub) => setStatoPush(sub ? "attivo" : "non-attivo"));
  }, []);

  async function handleAttivaPush() {
    setAttivandoPush(true);
    setErroreAzione(null);
    try {
      const risultato = await attivaNotifichePush();
      if (risultato === "attivato") setStatoPush("attivo");
      else if (risultato === "rifiutato") {
        setErroreAzione(
          "Le notifiche sono bloccate per questo sito. Controlla le impostazioni del browser/telefono."
        );
      } else {
        setErroreAzione("Questo browser non supporta le notifiche push.");
      }
    } catch (err) {
      console.error(err);
      setErroreAzione("Non siamo riuscite ad attivare le notifiche. Riprova.");
    } finally {
      setAttivandoPush(false);
    }
  }

  async function handleAzione(richiesta: BookingRequestConDettagli, azione: "conferma" | "rifiuta") {
    setErroreAzione(null);
    setIdInCorso(richiesta.id);

    try {
      const risposta = await fetch(
        azione === "conferma" ? "/api/admin/conferma-richiesta" : "/api/admin/rifiuta-richiesta",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: richiesta.id, slotId: richiesta.slot_id }),
        }
      );
      const json = await risposta.json();

      if (!json.ok) {
        setErroreAzione(json.error ?? "Errore durante l'aggiornamento. Riprova.");
        return;
      }

      setRichieste((prev) => prev.filter((r) => r.id !== richiesta.id));
    } catch {
      setErroreAzione("Errore di rete. Riprova.");
    } finally {
      setIdInCorso(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <p className="font-medium text-stone-800">Notifiche push</p>
          <p className="text-sm text-stone-500">
            {statoPush === "attivo" && "Attive su questo dispositivo."}
            {statoPush === "non-attivo" && "Attivale per essere avvisata anche a app chiusa."}
            {statoPush === "non-supportato" &&
              "Non supportate: apri il sito da Safari/Chrome e aggiungilo alla schermata Home (vedi README)."}
            {statoPush === "sconosciuto" && "Verifica in corso…"}
          </p>
        </div>
        {statoPush === "non-attivo" && (
          <button
            type="button"
            onClick={handleAttivaPush}
            disabled={attivandoPush}
            className="shrink-0 rounded-lg bg-coral-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {attivandoPush ? "Attivazione…" : "Attiva notifiche"}
          </button>
        )}
      </div>

      {erroreAzione && (
        <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {erroreAzione}
        </div>
      )}

      {richieste.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl bg-white p-6 text-center text-sm text-stone-500 shadow-sm"
        >
          Nessuna richiesta in attesa al momento.
        </div>
      ) : (
        <ul className="space-y-3" aria-live="polite">
          {richieste.map((r) => (
            <li key={r.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display font-semibold text-stone-800">{r.nome_cliente}</p>
                  <p className="text-sm text-stone-600">
                    <a href={`tel:${r.telefono_cliente}`} className="hover:underline">
                      {r.telefono_cliente}
                    </a>
                  </p>
                </div>
                <span className="rounded-full bg-coral-50 px-3 py-1 text-xs font-medium text-coral-700">
                  {r.service?.nome ?? "Servizio"}
                </span>
              </div>

              <p className="mt-2 text-sm text-stone-600">
                {r.slot ? (
                  <>
                    {nomeGiorno(r.slot.giorno)} · {formattaGiornoBreve(r.slot.giorno)} ·{" "}
                    {formattaOra(r.slot.ora_inizio)}–{formattaOra(r.slot.ora_fine)}
                  </>
                ) : (
                  "Orario non disponibile"
                )}
              </p>

              {r.note && (
                <p className="mt-1 text-sm italic text-stone-500">{`“${r.note}”`}</p>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleAzione(r, "conferma")}
                  disabled={idInCorso === r.id}
                  className="flex-1 rounded-lg bg-coral-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Confermato
                </button>
                <button
                  type="button"
                  onClick={() => handleAzione(r, "rifiuta")}
                  disabled={idInCorso === r.id}
                  className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Rifiutato
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
