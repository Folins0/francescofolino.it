"use client";

import { useState } from "react";
import { formattaGiornoBreve, nomeGiorno } from "@/lib/week";
import type { ServiceRow } from "@/types/database";
import type { BookingRequestConDettagli } from "@/components/admin/Richieste";

interface CalendarioProps {
  prenotazioniIniziali: BookingRequestConDettagli[];
  servizi: ServiceRow[];
}

interface FormModifica {
  nomeCliente: string;
  telefonoCliente: string;
  serviceId: string;
  note: string;
  giorno: string;
  oraInizio: string;
  oraFine: string;
}

function formattaOra(ora: string): string {
  return ora.slice(0, 5);
}

function creaForm(p: BookingRequestConDettagli): FormModifica {
  return {
    nomeCliente: p.nome_cliente,
    telefonoCliente: p.telefono_cliente,
    serviceId: p.service_id,
    note: p.note ?? "",
    giorno: p.slot?.giorno ?? "",
    oraInizio: p.slot ? formattaOra(p.slot.ora_inizio) : "",
    oraFine: p.slot ? formattaOra(p.slot.ora_fine) : "",
  };
}

function ordinaPerData(lista: BookingRequestConDettagli[]): BookingRequestConDettagli[] {
  return [...lista].sort((a, b) => {
    const da = a.slot ? `${a.slot.giorno} ${a.slot.ora_inizio}` : "";
    const db = b.slot ? `${b.slot.giorno} ${b.slot.ora_inizio}` : "";
    return da.localeCompare(db);
  });
}

export function Calendario({ prenotazioniIniziali, servizi }: CalendarioProps) {
  const [prenotazioni, setPrenotazioni] = useState(ordinaPerData(prenotazioniIniziali));
  const [modificandoId, setModificandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormModifica | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  function iniziaModifica(p: BookingRequestConDettagli) {
    setErrore(null);
    setModificandoId(p.id);
    setForm(creaForm(p));
  }

  function annullaModifica() {
    setModificandoId(null);
    setForm(null);
  }

  async function salvaModifica(p: BookingRequestConDettagli) {
    if (!form || !p.slot) return;
    setErrore(null);
    setSalvando(true);

    try {
      const res = await fetch("/api/admin/modifica-prenotazione", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: p.id,
          slotId: p.slot.id,
          nomeCliente: form.nomeCliente,
          telefonoCliente: form.telefonoCliente,
          serviceId: form.serviceId,
          note: form.note,
          giorno: form.giorno,
          oraInizio: form.oraInizio,
          oraFine: form.oraFine,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setErrore(json.error || "Errore durante il salvataggio.");
        return;
      }

      const servizioAggiornato = servizi.find((s) => s.id === form.serviceId) ?? p.service;
      setPrenotazioni((prev) =>
        ordinaPerData(
          prev.map((r) =>
            r.id === p.id
              ? {
                  ...r,
                  nome_cliente: form.nomeCliente,
                  telefono_cliente: form.telefonoCliente,
                  service_id: form.serviceId,
                  note: form.note || null,
                  service: servizioAggiornato,
                  slot: r.slot
                    ? {
                        ...r.slot,
                        giorno: form.giorno,
                        ora_inizio: form.oraInizio,
                        ora_fine: form.oraFine,
                      }
                    : r.slot,
                }
              : r
          )
        )
      );
      setModificandoId(null);
      setForm(null);
    } catch {
      setErrore("Errore di rete durante il salvataggio. Riprova.");
    } finally {
      setSalvando(false);
    }
  }

  async function elimina(p: BookingRequestConDettagli) {
    if (!p.slot) return;
    if (!window.confirm(`Cancellare l'appuntamento di ${p.nome_cliente}?`)) return;

    setErrore(null);
    setEliminandoId(p.id);

    try {
      const res = await fetch("/api/admin/rifiuta-richiesta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: p.id, slotId: p.slot.id }),
      });
      const json = await res.json();
      if (!json.ok) {
        setErrore(json.error || "Errore durante la cancellazione.");
        return;
      }
      setPrenotazioni((prev) => prev.filter((r) => r.id !== p.id));
    } catch {
      setErrore("Errore di rete durante la cancellazione. Riprova.");
    } finally {
      setEliminandoId(null);
    }
  }

  if (prenotazioni.length === 0) {
    return (
      <div
        role="status"
        className="rounded-2xl bg-white p-6 text-center text-sm text-stone-500 shadow-sm"
      >
        Nessuna prenotazione confermata in programma.
      </div>
    );
  }

  const giorniOrdinati = [
    ...new Set(prenotazioni.map((p) => p.slot?.giorno).filter((g): g is string => Boolean(g))),
  ];

  return (
    <div className="space-y-6">
      {errore && (
        <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {errore}
        </div>
      )}

      {giorniOrdinati.map((giorno) => (
        <div key={giorno}>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-stone-500">
            {nomeGiorno(giorno)} · {formattaGiornoBreve(giorno)}
          </h3>
          <ul className="mt-2 space-y-3">
            {prenotazioni
              .filter((p) => p.slot?.giorno === giorno)
              .map((p) => (
                <li key={p.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  {modificandoId === p.id && form ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm text-stone-600">
                          Nome
                          <input
                            type="text"
                            value={form.nomeCliente}
                            onChange={(e) => setForm({ ...form, nomeCliente: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="text-sm text-stone-600">
                          Telefono
                          <input
                            type="tel"
                            value={form.telefonoCliente}
                            onChange={(e) => setForm({ ...form, telefonoCliente: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                          />
                        </label>
                      </div>

                      <label className="block text-sm text-stone-600">
                        Servizio
                        <select
                          value={form.serviceId}
                          onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                        >
                          {servizi.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nome} — {s.prezzo_chf} CHF
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="grid grid-cols-3 gap-3">
                        <label className="text-sm text-stone-600">
                          Giorno
                          <input
                            type="date"
                            value={form.giorno}
                            onChange={(e) => setForm({ ...form, giorno: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="text-sm text-stone-600">
                          Dalle
                          <input
                            type="time"
                            value={form.oraInizio}
                            onChange={(e) => setForm({ ...form, oraInizio: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="text-sm text-stone-600">
                          Alle
                          <input
                            type="time"
                            value={form.oraFine}
                            onChange={(e) => setForm({ ...form, oraFine: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                          />
                        </label>
                      </div>

                      <label className="block text-sm text-stone-600">
                        Note
                        <textarea
                          value={form.note}
                          onChange={(e) => setForm({ ...form, note: e.target.value })}
                          rows={2}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                        />
                      </label>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => salvaModifica(p)}
                          disabled={salvando}
                          className="flex-1 rounded-lg bg-coral-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {salvando ? "Salvataggio…" : "Salva"}
                        </button>
                        <button
                          type="button"
                          onClick={annullaModifica}
                          disabled={salvando}
                          className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-display font-semibold text-stone-800">
                            {p.nome_cliente}
                          </p>
                          <p className="text-sm text-stone-600">
                            <a href={`tel:${p.telefono_cliente}`} className="hover:underline">
                              {p.telefono_cliente}
                            </a>
                          </p>
                        </div>
                        <span className="rounded-full bg-coral-50 px-3 py-1 text-xs font-medium text-coral-700">
                          {p.service?.nome ?? "Servizio"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-stone-600">
                        {p.slot
                          ? `${formattaOra(p.slot.ora_inizio)}–${formattaOra(p.slot.ora_fine)}`
                          : "Orario non disponibile"}
                      </p>

                      {p.note && (
                        <p className="mt-1 text-sm italic text-stone-500">{`"${p.note}"`}</p>
                      )}

                      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          onClick={() => iniziaModifica(p)}
                          className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-50"
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() => elimina(p)}
                          disabled={eliminandoId === p.id}
                          className="flex-1 rounded-lg border border-rose-300 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {eliminandoId === p.id ? "Cancellazione…" : "Cancella"}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
