"use client";

import { useState } from "react";
import type { BuonoTipo, ServiceRow } from "@/types/database";
import type {
  BuonoConServizio,
  BuonoCreateResponse,
  BuonoDeleteResponse,
  BuonoUpdateResponse,
} from "@/types/buoni";

function formattaData(iso: string): string {
  return new Date(iso).toLocaleDateString("it-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dettaglioBuono(b: BuonoConServizio): string {
  return b.tipo === "valore" ? `${b.valore_chf} CHF` : b.servizio_nome ?? "Servizio";
}

const STATO_STILE: Record<BuonoConServizio["stato"], string> = {
  attivo: "bg-emerald-50 text-emerald-700",
  usato: "bg-stone-100 text-stone-500",
  annullato: "bg-rose-50 text-rose-700",
};

const STATO_LABEL: Record<BuonoConServizio["stato"], string> = {
  attivo: "Attivo",
  usato: "Usato",
  annullato: "Annullato",
};

export function Buoni({
  buoniIniziali,
  servizi,
}: {
  buoniIniziali: BuonoConServizio[];
  servizi: ServiceRow[];
}) {
  const [buoni, setBuoni] = useState<BuonoConServizio[]>(buoniIniziali);
  const [overlayAperto, setOverlayAperto] = useState(false);
  const [tipo, setTipo] = useState<BuonoTipo>("valore");
  const [valoreChf, setValoreChf] = useState("");
  const [serviceId, setServiceId] = useState(servizi[0]?.id ?? "");
  const [codice, setCodice] = useState("");
  const [beneficiario, setBeneficiario] = useState("");
  const [note, setNote] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [idInCorso, setIdInCorso] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  function apriNuovo() {
    setErrore(null);
    setTipo("valore");
    setValoreChf("");
    setServiceId(servizi[0]?.id ?? "");
    setCodice("");
    setBeneficiario("");
    setNote("");
    setOverlayAperto(true);
  }

  async function confermaNuovo() {
    setErrore(null);
    setSalvando(true);
    try {
      const res = await fetch("/api/admin/buoni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codice: codice.trim() || undefined,
          tipo,
          valoreChf: tipo === "valore" ? Number(valoreChf) : undefined,
          serviceId: tipo === "servizio" ? serviceId : undefined,
          beneficiario: beneficiario.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const json: BuonoCreateResponse = await res.json();
      if (!json.ok || !json.buono) {
        setErrore(json.error || "Errore durante la creazione del buono.");
        return;
      }
      setBuoni((prev) => [json.buono!, ...prev]);
      setOverlayAperto(false);
    } catch {
      setErrore("Errore di rete. Riprova.");
    } finally {
      setSalvando(false);
    }
  }

  async function aggiornaStato(id: string, stato: "usato" | "annullato") {
    setErrore(null);
    setIdInCorso(id);
    try {
      const res = await fetch("/api/admin/buoni", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, stato }),
      });
      const json: BuonoUpdateResponse = await res.json();
      if (!json.ok || !json.buono) {
        setErrore(json.error || "Errore durante l'aggiornamento.");
        return;
      }
      setBuoni((prev) => prev.map((b) => (b.id === id ? json.buono! : b)));
    } catch {
      setErrore("Errore di rete. Riprova.");
    } finally {
      setIdInCorso(null);
    }
  }

  async function elimina(id: string) {
    if (!window.confirm("Eliminare definitivamente questo buono?")) return;
    setErrore(null);
    setIdInCorso(id);
    try {
      const res = await fetch("/api/admin/buoni", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json: BuonoDeleteResponse = await res.json();
      if (!json.ok) {
        setErrore(json.error || "Errore durante l'eliminazione.");
        return;
      }
      setBuoni((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setErrore("Errore di rete. Riprova.");
    } finally {
      setIdInCorso(null);
    }
  }

  const formValido = tipo === "valore" ? Number(valoreChf) > 0 : serviceId !== "";

  return (
    <div className="space-y-4">
      {errore && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {errore}
        </p>
      )}

      <button
        type="button"
        onClick={apriNuovo}
        className="rounded-lg bg-coral-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-800"
      >
        + Nuovo buono
      </button>

      {buoni.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-stone-500 shadow-sm">
          Nessun buono creato finora.
        </p>
      ) : (
        <ul className="space-y-3">
          {buoni.map((b) => (
            <li key={b.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-semibold text-stone-800">{b.codice}</p>
                  <p className="mt-0.5 text-sm text-stone-600">{dettaglioBuono(b)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATO_STILE[b.stato]}`}>
                  {STATO_LABEL[b.stato]}
                </span>
              </div>

              {b.beneficiario && (
                <p className="mt-2 text-sm text-stone-600">Per: {b.beneficiario}</p>
              )}
              {b.note && <p className="mt-1 text-sm italic text-stone-500">{`"${b.note}"`}</p>}

              <p className="mt-2 text-xs text-stone-400">
                Creato il {formattaData(b.creato_il)}
                {b.stato === "usato" && b.usato_il && ` · usato il ${formattaData(b.usato_il)}`}
              </p>

              {b.stato === "attivo" && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => aggiornaStato(b.id, "usato")}
                    disabled={idInCorso === b.id}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
                  >
                    Segna come usato
                  </button>
                  <button
                    type="button"
                    onClick={() => aggiornaStato(b.id, "annullato")}
                    disabled={idInCorso === b.id}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={() => elimina(b.id)}
                    disabled={idInCorso === b.id}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    Elimina
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {overlayAperto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOverlayAperto(false)}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-stone-700">Nuovo buono</p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTipo("valore")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${
                  tipo === "valore" ? "bg-coral-700 text-white" : "border border-stone-300 text-stone-600"
                }`}
              >
                Valore CHF
              </button>
              <button
                type="button"
                onClick={() => setTipo("servizio")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${
                  tipo === "servizio" ? "bg-coral-700 text-white" : "border border-stone-300 text-stone-600"
                }`}
              >
                Servizio
              </button>
            </div>

            {tipo === "valore" ? (
              <div>
                <label htmlFor="buono-valore" className="block text-xs text-stone-500">
                  Valore (CHF)
                </label>
                <input
                  id="buono-valore"
                  type="number"
                  min="1"
                  step="1"
                  value={valoreChf}
                  onChange={(e) => setValoreChf(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="buono-servizio" className="block text-xs text-stone-500">
                  Servizio
                </label>
                <select
                  id="buono-servizio"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700"
                >
                  {servizi.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="buono-codice" className="block text-xs text-stone-500">
                Codice (opzionale — se vuoto viene generato automaticamente)
              </label>
              <input
                id="buono-codice"
                type="text"
                value={codice}
                onChange={(e) => setCodice(e.target.value)}
                placeholder="es. SHOGA-AB12CD"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700"
              />
            </div>

            <div>
              <label htmlFor="buono-beneficiario" className="block text-xs text-stone-500">
                A chi lo dai (opzionale)
              </label>
              <input
                id="buono-beneficiario"
                type="text"
                value={beneficiario}
                onChange={(e) => setBeneficiario(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700"
              />
            </div>

            <div>
              <label htmlFor="buono-note" className="block text-xs text-stone-500">
                Note (opzionale)
              </label>
              <textarea
                id="buono-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={confermaNuovo}
                disabled={salvando || !formValido}
                className="flex-1 rounded-lg bg-coral-700 px-4 py-2 text-sm font-medium text-white hover:bg-coral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? "Creazione…" : "Crea buono"}
              </button>
              <button
                type="button"
                onClick={() => setOverlayAperto(false)}
                disabled={salvando}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
