"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formattaGiornoBreve, nomeGiorno } from "@/lib/week";
import { formattaDurata } from "@/lib/services";
import type { AvailableSlotRow, ServiceRow } from "@/types/database";

const TELEFONO_REGEX = /^[+\d][\d\s()-]{5,20}$/;

function formattaOra(ora: string): string {
  return ora.slice(0, 5); // "HH:MM:SS" -> "HH:MM"
}

function toMinuti(ora: string): number {
  const [h, m] = ora.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function daMinuti(minuti: number): string {
  const h = Math.floor(minuti / 60).toString().padStart(2, "0");
  const m = (minuti % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function durataBlocco(s: AvailableSlotRow): number {
  return toMinuti(s.ora_fine) - toMinuti(s.ora_inizio);
}

const PASSO_MINUTI = 30;

/** Orari di inizio selezionabili dentro un blocco, ogni PASSO_MINUTI, che
 * lasciano abbastanza spazio per la durata totale scelta. */
function orariDisponibili(slot: AvailableSlotRow, durataTotale: number): string[] {
  const inizio = toMinuti(slot.ora_inizio);
  const ultimoInizioValido = toMinuti(slot.ora_fine) - durataTotale;
  const orari: string[] = [];
  for (let t = inizio; t <= ultimoInizioValido; t += PASSO_MINUTI) {
    orari.push(daMinuti(t));
  }
  return orari;
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
  const serviziMani = useMemo(() => servizi.filter((s) => s.categoria === "mani"), [servizi]);
  const serviziPiedi = useMemo(() => servizi.filter((s) => s.categoria === "piedi"), [servizi]);

  const [serviceId, setServiceId] = useState(servizi[0]?.id ?? "");
  const servizioPrincipale = servizi.find((s) => s.id === serviceId) ?? null;

  const opzioniExtra = servizioPrincipale?.categoria === "piedi" ? serviziMani : serviziPiedi;
  const etichettaExtra = servizioPrincipale?.categoria === "piedi" ? "le mani" : "i piedi";

  const [aggiungiExtra, setAggiungiExtra] = useState(false);
  const [serviceIdExtra, setServiceIdExtra] = useState(opzioniExtra[0]?.id ?? "");

  // quando cambia il servizio principale, la lista delle opzioni extra cambia
  // (mani <-> piedi): resetta la scelta extra così non resta agganciata a un
  // servizio della categoria sbagliata.
  useEffect(() => {
    setAggiungiExtra(false);
    setServiceIdExtra(opzioniExtra[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const servizioExtra = aggiungiExtra ? servizi.find((s) => s.id === serviceIdExtra) ?? null : null;

  const durataTotale = (servizioPrincipale?.durata_minuti ?? 0) + (servizioExtra?.durata_minuti ?? 0);
  const prezzoTotale = (servizioPrincipale?.prezzo_chf ?? 0) + (servizioExtra?.prezzo_chf ?? 0);

  // solo i blocchi abbastanza lunghi da contenere la durata totale scelta
  const slotsDisponibili = useMemo(
    () => slots.filter((s) => durataBlocco(s) >= durataTotale),
    [slots, durataTotale]
  );
  const slotsPerGiorno = useMemo(() => raggruppaPerGiorno(slotsDisponibili), [slotsDisponibili]);

  const [slotId, setSlotId] = useState("");
  const [orarioPreferito, setOrarioPreferito] = useState("");

  const slotScelto = slotsDisponibili.find((s) => s.id === slotId) ?? null;

  // se il blocco scelto non è più tra quelli disponibili (perché la durata
  // totale è cambiata) annulla la selezione.
  useEffect(() => {
    if (slotId && !slotScelto) {
      setSlotId("");
      setOrarioPreferito("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotsDisponibili]);

  const orariScelta = useMemo(
    () => (slotScelto ? orariDisponibili(slotScelto, durataTotale) : []),
    [slotScelto, durataTotale]
  );

  // quando cambia il blocco scelto o la durata totale, riparte dal primo
  // orario disponibile (se quello scelto prima non è più valido).
  useEffect(() => {
    if (orariScelta.length > 0 && !orariScelta.includes(orarioPreferito)) {
      setOrarioPreferito(orariScelta[0]);
    } else if (orariScelta.length === 0) {
      setOrarioPreferito("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orariScelta]);

  const [nome, setNome] = useState("");
  const [telefono, setTelefono] = useState("");
  const [note, setNote] = useState("");
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inviata, setInviata] = useState(false);

  const orarioValido = orarioPreferito !== "" && orariScelta.includes(orarioPreferito);

  const validazioneOk =
    slotId !== "" &&
    serviceId !== "" &&
    orarioValido &&
    nome.trim().length > 0 &&
    TELEFONO_REGEX.test(telefono.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);

    if (!validazioneOk) {
      setErrore("Controlla di aver scelto un servizio, un giorno, un orario valido e compilato nome e telefono.");
      return;
    }

    setInviando(true);

    try {
      const risposta = await fetch("/api/prenota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          nomeCliente: nome.trim(),
          telefonoCliente: telefono.trim(),
          serviceId,
          serviceIdExtra: servizioExtra?.id ?? null,
          durataMinuti: durataTotale,
          prezzoChf: prezzoTotale,
          orarioPreferito,
          note: note.trim() || null,
          giornoLabel: slotScelto ? formattaGiornoBreve(slotScelto.giorno) : "",
          orarioLabel: `${orarioPreferito}–${daMinuti(toMinuti(orarioPreferito) + durataTotale)}`,
          servizioLabel: [servizioPrincipale?.nome, servizioExtra?.nome].filter(Boolean).join(" + "),
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
        <Link
          href="/"
          className="mt-5 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-coral-700 to-rose-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md"
        >
          Torna indietro
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
          <optgroup label="Mani">
            {serviziMani.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} — {s.prezzo_chf} CHF · {formattaDurata(s.durata_minuti)}
              </option>
            ))}
          </optgroup>
          <optgroup label="Piedi">
            {serviziPiedi.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} — {s.prezzo_chf} CHF · {formattaDurata(s.durata_minuti)}
              </option>
            ))}
          </optgroup>
        </select>
        {servizioPrincipale?.descrizione && (
          <p className="mt-1.5 text-sm text-stone-500">{servizioPrincipale.descrizione}</p>
        )}
      </div>

      {opzioniExtra.length > 0 && (
        <div className="rounded-xl border border-marble-200 bg-white/70 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
            <input
              type="checkbox"
              checked={aggiungiExtra}
              onChange={(e) => setAggiungiExtra(e.target.checked)}
              className="h-4 w-4 rounded border-marble-300 text-coral-700 focus:ring-coral-300"
            />
            Aggiungi anche {etichettaExtra}
          </label>

          {aggiungiExtra && opzioniExtra.length > 1 && (
            <select
              className="mt-3 w-full rounded-xl border border-marble-300 bg-white px-4 py-2.5 text-stone-800 focus:border-coral-400 focus:outline-none focus:ring-2 focus:ring-coral-200"
              value={serviceIdExtra}
              onChange={(e) => setServiceIdExtra(e.target.value)}
            >
              {opzioniExtra.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} — {s.prezzo_chf} CHF · {formattaDurata(s.durata_minuti)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="rounded-xl bg-coral-50 px-4 py-3 text-sm text-coral-700">
        Totale: <span className="font-semibold">{prezzoTotale} CHF</span> ·{" "}
        <span className="font-semibold">{formattaDurata(durataTotale)}</span>
      </div>

      <fieldset>
        <legend className="mb-2 font-display text-lg font-semibold text-stone-800">
          Scegli un giorno
        </legend>
        {slotsPerGiorno.size === 0 ? (
          <p className="text-sm text-stone-500">
            Nessun orario abbastanza lungo per questa combinazione di servizi questa settimana.
          </p>
        ) : (
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
        )}
      </fieldset>

      {slotScelto && (
        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-stone-600">
            A che ora preferisci? (dura {formattaDurata(durataTotale)})
          </legend>
          {orariScelta.length === 0 ? (
            <p className="text-sm text-stone-500">Nessun orario disponibile in questo blocco.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {orariScelta.map((ora) => (
                <button
                  key={ora}
                  type="button"
                  onClick={() => setOrarioPreferito(ora)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    orarioPreferito === ora
                      ? "border-coral-700 bg-coral-700 text-white"
                      : "border-marble-300 bg-white text-stone-700 hover:border-coral-300"
                  }`}
                >
                  {ora}
                </button>
              ))}
            </div>
          )}
        </fieldset>
      )}

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
