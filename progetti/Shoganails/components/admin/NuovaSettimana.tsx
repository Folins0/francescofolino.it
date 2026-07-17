"use client";

import { useMemo, useState } from "react";
import { PhotoUpload } from "@/components/admin/PhotoUpload";
import { ShiftReviewTable } from "@/components/admin/ShiftReviewTable";
import { calcolaFasceLibere, GIORNATA_DEFAULT } from "@/lib/shifts";
import { currentWeekDates, formattaGiornoBreve } from "@/lib/week";
import type {
  GiornoReview,
  GiornoTurni,
  ParseShiftSheetResponse,
  PublishWeekPayload,
} from "@/types/shifts";

type Stato = "idle" | "analizzando" | "revisione" | "pubblicando" | "pubblicato";

function costruisciGiorniCompleti(
  giorniAI: GiornoTurni[],
  weekDates: string[],
  giornata: { inizio: string; fine: string }
): GiornoReview[] {
  return weekDates.map((data) => {
    const trovato = giorniAI.find((g) => g.data === data);
    const base: GiornoTurni = trovato ?? {
      data,
      turni: [],
      libero_tutto_il_giorno: true,
      note_flag: ["Giorno non trovato nel foglio: verifica manualmente"],
    };
    return { ...base, fasce_libere: calcolaFasceLibere(base, giornata) };
  });
}

function costruisciTemplateManuale(weekDates: string[]): GiornoReview[] {
  return weekDates.map((data) => ({
    data,
    turni: [],
    libero_tutto_il_giorno: false,
    note_flag: [],
    fasce_libere: calcolaFasceLibere(
      { turni: [], libero_tutto_il_giorno: false },
      GIORNATA_DEFAULT
    ),
  }));
}

export function NuovaSettimana() {
  const weekDates = useMemo(() => currentWeekDates(), []);
  const [stato, setStato] = useState<Stato>("idle");
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [weekId, setWeekId] = useState<string | null>(null);
  const [shiftUploadId, setShiftUploadId] = useState<string | null>(null);
  const [giornata, setGiornata] = useState(GIORNATA_DEFAULT);
  const [giorni, setGiorni] = useState<GiornoReview[]>([]);

  async function handleAnalizza(file: File) {
    setStato("analizzando");
    setErrore(null);
    setAvviso(null);

    const formData = new FormData();
    formData.append("foto", file);

    try {
      const res = await fetch("/api/admin/parse-shift-sheet", {
        method: "POST",
        body: formData,
      });
      const json: ParseShiftSheetResponse = await res.json();

      if (!json.ok) {
        if (json.weekId) setWeekId(json.weekId);
        setErrore(json.error);
        setStato("idle");
        return;
      }

      setWeekId(json.weekId);
      setShiftUploadId(json.shiftUploadId);
      if (json.bassa_confidenza) {
        setAvviso(
          json.avviso ||
            "L'IA non è del tutto sicura della lettura: controlla con attenzione ogni riga prima di pubblicare."
        );
      }
      setGiorni(costruisciGiorniCompleti(json.giorni, weekDates, giornata));
      setStato("revisione");
    } catch {
      setErrore(
        "Errore di rete durante l'analisi della foto. Controlla la connessione e riprova."
      );
      setStato("idle");
    }
  }

  async function handleCorreggiAMano() {
    setErrore(null);
    setAvviso(null);

    let weekIdCorrente = weekId;
    if (!weekIdCorrente) {
      try {
        const res = await fetch("/api/admin/ensure-week", { method: "POST" });
        const json = await res.json();
        if (!json.ok) {
          setErrore(json.error || "Impossibile preparare la settimana.");
          return;
        }
        weekIdCorrente = json.weekId;
        setWeekId(json.weekId);
      } catch {
        setErrore("Errore di rete: impossibile preparare la settimana corrente.");
        return;
      }
    }

    setShiftUploadId(null);
    setGiorni(costruisciTemplateManuale(weekDates));
    setStato("revisione");
  }

  function handleRicaricaFoto() {
    setErrore(null);
    setAvviso(null);
    setStato("idle");
  }

  async function handlePubblica() {
    if (!weekId) {
      setErrore("Settimana non identificata: ricarica la pagina e riprova.");
      return;
    }

    // Validazione lato client: turni "a chiusura" senza orario.
    for (const giorno of giorni) {
      for (const turno of giorno.turni) {
        if (turno.nota_chiusura && !turno.fine) {
          setErrore(
            `Manca l'orario di chiusura per un turno del ${formattaGiornoBreve(
              giorno.data
            )}. Inseriscilo prima di pubblicare.`
          );
          return;
        }
      }
    }

    setStato("pubblicando");
    setErrore(null);

    const payload: PublishWeekPayload = {
      weekId,
      shiftUploadId: shiftUploadId ?? undefined,
      giorni,
    };

    try {
      const res = await fetch("/api/admin/publish-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.ok) {
        setErrore(json.error || "Errore durante la pubblicazione.");
        setStato("revisione");
        return;
      }

      setStato("pubblicato");
    } catch {
      setErrore("Errore di rete durante la pubblicazione. Riprova.");
      setStato("revisione");
    }
  }

  function handleNuovaSettimanaReset() {
    setStato("idle");
    setErrore(null);
    setAvviso(null);
    setWeekId(null);
    setShiftUploadId(null);
    setGiorni([]);
    setGiornata(GIORNATA_DEFAULT);
  }

  if (stato === "pubblicato") {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-3xl">✅</p>
        <h3 className="mt-2 font-display text-lg text-stone-800">
          Settimana pubblicata!
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          Gli orari liberi sono ora visibili alle clienti nella pagina
          prenotazioni.
        </p>
        <button
          type="button"
          onClick={handleNuovaSettimanaReset}
          className="mt-4 rounded-lg bg-coral-700 px-4 py-2 text-sm font-medium text-white hover:bg-coral-800"
        >
          Carica un'altra foto
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errore && (
        <div
          role="alert"
          className="space-y-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
        >
          <p>{errore}</p>
          {stato === "idle" && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRicaricaFoto}
                className="font-medium underline"
              >
                Ricarica la foto
              </button>
              <button
                type="button"
                onClick={handleCorreggiAMano}
                className="font-medium underline"
              >
                Correggi tutto a mano
              </button>
            </div>
          )}
        </div>
      )}

      {avviso && stato === "revisione" && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          ⚠️ {avviso}
        </div>
      )}

      {(stato === "idle" || stato === "analizzando") && (
        <>
          <PhotoUpload
            onAnalizza={handleAnalizza}
            caricamento={stato === "analizzando"}
          />
          {stato === "idle" && (
            <button
              type="button"
              onClick={handleCorreggiAMano}
              className="text-sm font-medium text-stone-500 underline"
            >
              Preferisco inserire gli orari a mano, senza foto
            </button>
          )}
        </>
      )}

      {(stato === "revisione" || stato === "pubblicando") && (
        <>
          <ShiftReviewTable
            giorni={giorni}
            onChange={setGiorni}
            giornata={giornata}
            onGiornataChange={setGiornata}
          />

          <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <button
              type="button"
              disabled={stato === "pubblicando"}
              onClick={handlePubblica}
              className="rounded-lg bg-coral-700 px-5 py-2 font-medium text-white transition hover:bg-coral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {stato === "pubblicando"
                ? "Pubblicazione…"
                : "Conferma e pubblica"}
            </button>
            <button
              type="button"
              disabled={stato === "pubblicando"}
              onClick={handleNuovaSettimanaReset}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-60"
            >
              Ricomincia da capo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
