import type { FasciaLibera, GiornoTurni, Turno } from "@/types/shifts";

/** Orario di disponibilità di default per le unghie, se un giorno è tutto libero. */
export const GIORNATA_DEFAULT = { inizio: "09:00", fine: "19:00" };

/** "HH:MM" -> minuti dalla mezzanotte. Ritorna null se il formato non è valido. */
export function toMinuti(orario: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(orario.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** minuti dalla mezzanotte -> "HH:MM". */
export function daMinuti(minuti: number): string {
  const h = Math.floor(minuti / 60)
    .toString()
    .padStart(2, "0");
  const m = (minuti % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Un turno è valido/utilizzabile per il calcolo se ha inizio e fine in formato orario corretto. */
export function turnoValido(t: Turno): boolean {
  const ini = toMinuti(t.inizio);
  const fin = toMinuti(t.fine);
  return ini !== null && fin !== null && fin > ini;
}

/**
 * Calcola le fasce libere di un giorno = orario di disponibilità (giornata)
 * meno i turni occupati, unendo eventuali turni sovrapposti/adiacenti.
 *
 * Se il giorno è "libero_tutto_il_giorno", ritorna l'intera giornata.
 * Turni non validi (es. nota_chiusura senza orario di chiusura inserito
 * a mano) vengono ignorati nel calcolo, così da non bloccare la revisione:
 * l'admin li completa a mano prima di pubblicare.
 */
export function calcolaFasceLibere(
  giorno: Pick<GiornoTurni, "turni" | "libero_tutto_il_giorno">,
  giornata: { inizio: string; fine: string } = GIORNATA_DEFAULT
): FasciaLibera[] {
  const giornataIni = toMinuti(giornata.inizio);
  const giornataFin = toMinuti(giornata.fine);
  if (giornataIni === null || giornataFin === null || giornataFin <= giornataIni) {
    return [];
  }

  if (giorno.libero_tutto_il_giorno) {
    return [{ inizio: giornata.inizio, fine: giornata.fine }];
  }

  const intervalliOccupati = giorno.turni
    .filter(turnoValido)
    .map((t) => [toMinuti(t.inizio)!, toMinuti(t.fine)!] as [number, number])
    // ritaglia dentro i confini della giornata disponibile
    .map(([a, b]) => [Math.max(a, giornataIni), Math.min(b, giornataFin)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);

  // unisce intervalli sovrapposti/adiacenti
  const uniti: [number, number][] = [];
  for (const iv of intervalliOccupati) {
    const ultimo = uniti[uniti.length - 1];
    if (ultimo && iv[0] <= ultimo[1]) {
      ultimo[1] = Math.max(ultimo[1], iv[1]);
    } else {
      uniti.push([...iv]);
    }
  }

  const libere: FasciaLibera[] = [];
  let cursore = giornataIni;
  for (const [a, b] of uniti) {
    if (a > cursore) {
      libere.push({ inizio: daMinuti(cursore), fine: daMinuti(a) });
    }
    cursore = Math.max(cursore, b);
  }
  if (cursore < giornataFin) {
    libere.push({ inizio: daMinuti(cursore), fine: daMinuti(giornataFin) });
  }

  return libere;
}

/** Nomi/varianti tollerate come corrispondenti a "Grazia" (errori di battitura/OCR comuni). */
export const VARIANTI_NOME_GRAZIA = [
  "grazia",
  "grazi4",
  "gr4zia",
  "grasia",
  "graz1a",
  "graziа", // possibile omoglifo cirillico "а"
];

export function sembraNomeGrazia(nome: string): boolean {
  const normalizzato = nome.trim().toLowerCase();
  return VARIANTI_NOME_GRAZIA.some(
    (v) => normalizzato === v || normalizzato.includes(v)
  );
}
