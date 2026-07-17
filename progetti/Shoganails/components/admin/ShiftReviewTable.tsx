"use client";

import { calcolaFasceLibere, GIORNATA_DEFAULT } from "@/lib/shifts";
import { formattaGiornoBreve, nomeGiorno } from "@/lib/week";
import type { FasciaLibera, GiornoReview, Turno } from "@/types/shifts";

interface ShiftReviewTableProps {
  giorni: GiornoReview[];
  onChange: (giorni: GiornoReview[]) => void;
  giornata: { inizio: string; fine: string };
  onGiornataChange: (giornata: { inizio: string; fine: string }) => void;
}

function turnoVuoto(): Turno {
  return { inizio: "", fine: "", nota_chiusura: false };
}

function fasciaVuota(): FasciaLibera {
  return { inizio: "", fine: "" };
}

export function ShiftReviewTable({
  giorni,
  onChange,
  giornata,
  onGiornataChange,
}: ShiftReviewTableProps) {
  function aggiornaGiorno(index: number, patch: Partial<GiornoReview>) {
    const nuovi = giorni.map((g, i) => (i === index ? { ...g, ...patch } : g));
    onChange(nuovi);
  }

  function ricalcolaFasce(index: number, giornoAggiornato: GiornoReview) {
    const fasce = calcolaFasceLibere(giornoAggiornato, giornata);
    aggiornaGiorno(index, { ...giornoAggiornato, fasce_libere: fasce });
  }

  function toggleLibero(index: number, libero: boolean) {
    const g = giorni[index];
    const aggiornato: GiornoReview = {
      ...g,
      libero_tutto_il_giorno: libero,
      turni: libero ? [] : g.turni,
    };
    ricalcolaFasce(index, aggiornato);
  }

  function aggiornaTurno(gi: number, ti: number, patch: Partial<Turno>) {
    const g = giorni[gi];
    const turni = g.turni.map((t, i) => (i === ti ? { ...t, ...patch } : t));
    ricalcolaFasce(gi, { ...g, turni });
  }

  function aggiungiTurno(gi: number) {
    const g = giorni[gi];
    aggiornaGiorno(gi, { turni: [...g.turni, turnoVuoto()] });
  }

  function rimuoviTurno(gi: number, ti: number) {
    const g = giorni[gi];
    const turni = g.turni.filter((_, i) => i !== ti);
    ricalcolaFasce(gi, { ...g, turni });
  }

  function ricalcolaDaAuto(gi: number) {
    const g = giorni[gi];
    ricalcolaFasce(gi, g);
  }

  function aggiornaFascia(gi: number, fi: number, patch: Partial<FasciaLibera>) {
    const g = giorni[gi];
    const fasce_libere = g.fasce_libere.map((f, i) =>
      i === fi ? { ...f, ...patch } : f
    );
    aggiornaGiorno(gi, { fasce_libere });
  }

  function aggiungiFascia(gi: number) {
    const g = giorni[gi];
    aggiornaGiorno(gi, { fasce_libere: [...g.fasce_libere, fasciaVuota()] });
  }

  function rimuoviFascia(gi: number, fi: number) {
    const g = giorni[gi];
    aggiornaGiorno(gi, {
      fasce_libere: g.fasce_libere.filter((_, i) => i !== fi),
    });
  }

  function rimuoviNota(gi: number, ni: number) {
    const g = giorni[gi];
    aggiornaGiorno(gi, { note_flag: g.note_flag.filter((_, i) => i !== ni) });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-stone-600">
            Disponibilità dalle
          </label>
          <input
            type="time"
            value={giornata.inizio}
            onChange={(e) =>
              onGiornataChange({ ...giornata, inizio: e.target.value })
            }
            className="mt-1 rounded-lg border border-stone-300 px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600">
            alle
          </label>
          <input
            type="time"
            value={giornata.fine}
            onChange={(e) =>
              onGiornataChange({ ...giornata, fine: e.target.value })
            }
            className="mt-1 rounded-lg border border-stone-300 px-2 py-1 text-sm"
          />
        </div>
        <p className="text-xs text-stone-500">
          Usato per calcolare gli orari liberi nei giorni completamente
          liberi (default {GIORNATA_DEFAULT.inizio}–{GIORNATA_DEFAULT.fine}).
        </p>
      </div>

      {giorni.map((giorno, gi) => (
        <div key={gi} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-stone-800">
              {nomeGiorno(giorno.data) || `Giorno ${gi + 1}`}{" "}
              <span className="font-normal text-stone-500">
                {giorno.data ? formattaGiornoBreve(giorno.data) : ""}
              </span>
            </h3>
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={giorno.libero_tutto_il_giorno}
                onChange={(e) => toggleLibero(gi, e.target.checked)}
              />
              Giorno libero
            </label>
          </div>

          {giorno.note_flag.length > 0 && (
            <div className="mt-2 space-y-1 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
              <p className="font-medium">
                ⚠️ Note/asterischi rilevati vicino al nome (verifica tu il
                significato):
              </p>
              <ul className="space-y-1">
                {giorno.note_flag.map((nota, ni) => (
                  <li key={ni} className="flex items-center justify-between gap-2">
                    <span>{nota}</span>
                    <button
                      type="button"
                      onClick={() => rimuoviNota(gi, ni)}
                      className="text-xs text-amber-600 underline"
                    >
                      rimuovi
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!giorno.libero_tutto_il_giorno && (
            <div className="mt-3 space-y-2">
              {giorno.turni.length === 0 && (
                <p className="text-sm text-stone-500">
                  Nessun turno letto per questo giorno.
                </p>
              )}
              {giorno.turni.map((turno, ti) => (
                <div
                  key={ti}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 p-2"
                >
                  <div>
                    <label className="block text-[11px] text-stone-500">
                      Inizio
                    </label>
                    <input
                      type="time"
                      value={turno.inizio}
                      onChange={(e) =>
                        aggiornaTurno(gi, ti, { inizio: e.target.value })
                      }
                      className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
                    />
                  </div>

                  {turno.nota_chiusura ? (
                    <div>
                      <label className="block text-[11px] text-amber-600">
                        Orario di chiusura (da inserire)
                      </label>
                      <input
                        type="time"
                        value={turno.fine}
                        onChange={(e) =>
                          aggiornaTurno(gi, ti, { fine: e.target.value })
                        }
                        required
                        className="rounded-lg border border-amber-400 bg-amber-50 px-2 py-1 text-sm"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] text-stone-500">
                        Fine
                      </label>
                      <input
                        type="time"
                        value={turno.fine}
                        onChange={(e) =>
                          aggiornaTurno(gi, ti, { fine: e.target.value })
                        }
                        className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-1 text-xs text-stone-600">
                    <input
                      type="checkbox"
                      checked={turno.nota_chiusura}
                      onChange={(e) =>
                        aggiornaTurno(gi, ti, {
                          nota_chiusura: e.target.checked,
                          fine: e.target.checked ? "" : turno.fine,
                        })
                      }
                    />
                    a chiusura
                  </label>

                  <button
                    type="button"
                    onClick={() => rimuoviTurno(gi, ti)}
                    className="ml-auto text-xs text-rose-700 underline"
                  >
                    rimuovi turno
                  </button>
                </div>
              ))}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => aggiungiTurno(gi)}
                  className="text-xs font-medium text-coral-700 underline"
                >
                  + aggiungi turno
                </button>
                <button
                  type="button"
                  onClick={() => ricalcolaDaAuto(gi)}
                  className="text-xs font-medium text-stone-500 underline"
                >
                  ricalcola orari liberi dai turni
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 rounded-lg bg-marble-50 p-2">
            <p className="text-xs font-medium text-stone-600">
              Orari liberi proposti per le prenotazioni
            </p>
            {giorno.fasce_libere.length === 0 && (
              <p className="mt-1 text-xs text-stone-500">
                Nessuna fascia libera per questo giorno.
              </p>
            )}
            <div className="mt-1 space-y-1">
              {giorno.fasce_libere.map((fascia, fi) => (
                <div key={fi} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={fascia.inizio}
                    onChange={(e) =>
                      aggiornaFascia(gi, fi, { inizio: e.target.value })
                    }
                    className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
                  />
                  <span className="text-stone-400">–</span>
                  <input
                    type="time"
                    value={fascia.fine}
                    onChange={(e) =>
                      aggiornaFascia(gi, fi, { fine: e.target.value })
                    }
                    className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => rimuoviFascia(gi, fi)}
                    className="text-xs text-rose-700 underline"
                  >
                    rimuovi
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => aggiungiFascia(gi)}
              className="mt-1 text-xs font-medium text-coral-700 underline"
            >
              + aggiungi fascia libera
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
