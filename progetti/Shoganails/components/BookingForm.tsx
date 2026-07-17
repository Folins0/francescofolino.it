"use client";

import { useMemo, useState } from "react";
import { formattaGiornoBreve, nomeGiorno } from "@/lib/week";
import type { AvailableSlotRow, ServiceRow } from "@/types/database";

const TELEFONO_REGEX = /^[+\d][\d\s()-]{5,20}$/;

function formattaOra(ora: string): string {
  return ora.slice(0, 5); // "HH:MM:SS" -> "HH:MM"
}

function raggruppaPerGiorno(slots: AvailableSlotRow[]): Map<string, AvailableSlotRow[]> {
  const mappa = new Map<string, AvailableSlotRow[]>();
  for (const slot of slots) {
    const lista = mappa.get(slot.giorno) ?? [];
    lista.push(slot);
    mappa.set(slot.giorno, lista);
  }
  return mappa;
}

export function BookingForm({
  slots,
  servizi,
}: {
  slots: AvailableSlotRow[];
  servizi: ServiceRow[];
}) {
  const [slotId, setSlotId] = useState("");
  const [serviceId, setServiceId] = useState(servizi[0]?.id ?? "");
  const [nome, setNome] = useState("");
  const [telefono, setTelefono] = useState("");
  const [note, setNote] = useState("");
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inviata, setInviata] = useState(false);

  const slotsPerGiorno = useMemo(() => raggruppaPerGiorno(slots), [slots]);

  const validazioneOk =
    slotId !== "" &&
    serviceId !== "" &&
    nome.trim().length > 0 &&
    TELEFONO_REGEX.test(telefono.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);

    if (!validazioneOk) {
      setErrore("Controlla di aver compilato nome, telefono e scelto un orario.");
      return;
    }

    setInviando(true);

    const slotScelto = slots.find((s) => s.id === slotId);
    const servizioScelto = servizi.find((s) => s.id === serviceId);

    try {
      const risposta = await fetch("/api/prenota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          nomeCliente: nome.trim(),
          telefonoCliente: telefono.trim(),
          serviceId,
          orarioPreferito: slotScelto?.ora_inizio ?? null,
          note: note.trim() || null,
          giornoLabel: slotScelto ? formattaGiornoBreve(slotScelto.giorno) : "",
          orarioLabel: slotScelto
            ? `${formattaOra(slotScelto.ora_inizio)}–${formattaOra(slotScelto.ora_fine)}`
            : "",
          servizioLabel: servizioScelto?.nome ?? "",
        }),
      });

      const json = await risposta.json();

      if (!json.ok) {
        setErrore(json.error ?? "Non siamo riuscite a inviare la richiesta. Riprova.");
        setInviando(false);
        return;
      }

      setInviata(true);
    } catch {
      setErrore("Errore di rete. Controlla la connessione e riprova.");
    } finally {
      setInviando(false);
    }
  }

  if (inviata) {
    return (
      <div className="mt-8 rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-3xl">✅</p>
        <p className="mt-2 font-display text-xl font-semibold text-stone-800">
          Richiesta inviata!
        </p>
        <p className="mt-2 text-sm text-stone-500">
          Ti contatteremo su WhatsApp per confermare l&apos;appuntamento.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <fieldset>
        <legend className="mb-2 font-display text-lg font-semibold text-stone-800">
          Scegli un orario
        </legend>
        <div className="space-y-4">
          {Array.from(slotsPerGiorno.entries()).map(([giorno, slotsGiorno]) => (
            <div key={giorno}>
              <p className="mb-2 text-sm font-medium text-stone-500">
                {nomeGiorno(giorno)} · {formattaGiornoBreve(giorno)}
              </p>
              <div className="flex flex-wrap gap-2">
                {slotsGiorno.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSlotId(s.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      slotId === s.id
                        ? "border-coral-700 bg-coral-700 text-white"
                        : "border-marble-300 bg-white text-stone-700 hover:border-coral-300"
                    }`}
                  >
                    {formattaOra(s.ora_inizio)}–{formattaOra(s.ora_fine)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="servizio">
          Servizio
        </label>
        <select
          id="servizio"
          className="w-full rounded-xl border border-marble-300 bg-white px-4 py-2.5 text-stone-800 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-200"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          {servizi.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} — {s.prezzo_chf} CHF
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="nome">
          Nome e cognome
        </label>
        <input
          id="nome"
          type="text"
          className="w-full rounded-xl border border-marble-300 bg-white px-4 py-2.5 text-stone-800 placeholder:text-stone-400 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-200"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Es. Maria Rossi"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="telefono">
          Numero di telefono
        </label>
        <input
          id="telefono"
          type="tel"
          className="w-full rounded-xl border border-marble-300 bg-white px-4 py-2.5 text-stone-800 placeholder:text-stone-400 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-200"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Es. 079 123 45 67"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="note">
          Note (facoltativo)
        </label>
        <textarea
          id="note"
          className="w-full rounded-xl border border-marble-300 bg-white px-4 py-2.5 text-stone-800 placeholder:text-stone-400 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-200"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Preferenze particolari, colore, ecc."
        />
      </div>

      {errore && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{errore}</p>
      )}

      <button
        type="submit"
        disabled={!validazioneOk || inviando}
        className="w-full rounded-full bg-gradient-to-r from-coral-700 to-rose-700 px-6 py-3.5 font-display text-base font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
      >
        {inviando ? "Invio in corso…" : "Invia richiesta"}
      </button>
    </form>
  );
}
