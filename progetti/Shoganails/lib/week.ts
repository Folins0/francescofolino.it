// Utility per lavorare con "la settimana corrente" (lunedì-domenica).

const GIORNI_IT = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Data di oggi in formato ISO "YYYY-MM-DD" (fuso orario locale). */
export function oggiISO(ref: Date = new Date()): string {
  return toISODate(ref);
}

/** Restituisce il lunedì della settimana di `ref` (default: oggi), a mezzanotte locale. */
export function startOfWeek(ref: Date = new Date()): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dayIndex = (d.getDay() + 6) % 7; // 0 = lunedì ... 6 = domenica
  d.setDate(d.getDate() - dayIndex);
  return d;
}

/** Le 7 date (lunedì-domenica) della settimana corrente, in formato ISO YYYY-MM-DD. */
export function currentWeekDates(ref: Date = new Date()): string[] {
  const monday = startOfWeek(ref);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toISODate(d);
  });
}

/** { data_inizio, data_fine } della settimana corrente, in formato ISO. */
export function currentWeekRange(ref: Date = new Date()): {
  data_inizio: string;
  data_fine: string;
} {
  const dates = currentWeekDates(ref);
  return { data_inizio: dates[0], data_fine: dates[6] };
}

/** Nome del giorno in italiano a partire da una data ISO "YYYY-MM-DD". */
export function nomeGiorno(dataISO: string): string {
  const [y, m, d] = dataISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayIndex = (date.getDay() + 6) % 7;
  return GIORNI_IT[dayIndex];
}

/** Formatta una data ISO come "lun 21/07". */
export function formattaGiornoBreve(dataISO: string): string {
  const [y, m, d] = dataISO.split("-").map(Number);
  const nome = nomeGiorno(dataISO).slice(0, 3).toLowerCase();
  return `${nome} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}
