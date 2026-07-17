// Dati statici dei servizi mostrati in homepage (raggruppati per categoria:
// Mani/Piedi). Il form di prenotazione in /prenota usa invece i dati live
// dalla tabella `services` su Supabase, non questo file.
export type ServiceOption = {
  id: string;
  nome: string;
  prezzoChf: number;
  durataMinuti: number;
  descrizione: string;
};

export type ServiceCategory = {
  id: string;
  nome: string;
  opzioni: ServiceOption[];
};

export function formattaDurata(minuti: number): string {
  if (minuti % 60 === 0) return `${minuti / 60} ${minuti === 60 ? "ora" : "ore"}`;
  return `${(minuti / 60).toString().replace(".", ",")} ore`;
}

export const serviceCategories: ServiceCategory[] = [
  {
    id: "mani",
    nome: "Mani",
    opzioni: [
      {
        id: "semipermanente-semplice",
        nome: "Semipermanente semplice",
        prezzoChf: 30,
        durataMinuti: 60,
        descrizione: "Smalto semipermanente classico",
      },
      {
        id: "semipermanente-rinforzato",
        nome: "Semipermanente rinforzato",
        prezzoChf: 40,
        durataMinuti: 90,
        descrizione: "Smalto semipermanente con rinforzo in gel, per una tenuta più lunga",
      },
      {
        id: "ricostruzione-da-zero",
        nome: "Ricostruzione da zero",
        prezzoChf: 40,
        durataMinuti: 120,
        descrizione: "Ricostruzione unghie in gel, acrygel o acrilico, da zero",
      },
      {
        id: "ricostruzione-refill",
        nome: "Ricostruzione refill",
        prezzoChf: 40,
        durataMinuti: 90,
        descrizione: "Ricostruzione unghie in gel, acrygel o acrilico, refill",
      },
    ],
  },
  {
    id: "piedi",
    nome: "Piedi",
    opzioni: [
      {
        id: "pedicure-estetica",
        nome: "Pedicure estetica con semipermanente",
        prezzoChf: 30,
        durataMinuti: 60,
        descrizione: "Cura e nail art per i piedi con smalto semipermanente",
      },
    ],
  },
];
