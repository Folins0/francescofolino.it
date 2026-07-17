// Dati statici dei servizi mostrati in homepage (raggruppati per categoria:
// Mani/Piedi/Mani+Piedi). Il form di prenotazione in /prenota usa invece i
// dati live dalla tabella `services` su Supabase, non questo file.
export type ServiceOption = {
  id: string;
  nome: string;
  prezzoChf: number;
  descrizione: string;
};

export type ServiceCategory = {
  id: string;
  nome: string;
  opzioni: ServiceOption[];
};

export const serviceCategories: ServiceCategory[] = [
  {
    id: "mani",
    nome: "Mani",
    opzioni: [
      {
        id: "semipermanente-rinforzato",
        nome: "Semipermanente rinforzato",
        prezzoChf: 40,
        descrizione: "Smalto semipermanente con rinforzo in gel, per una tenuta più lunga",
      },
      {
        id: "semipermanente-semplice",
        nome: "Semipermanente semplice",
        prezzoChf: 30,
        descrizione: "Smalto semipermanente classico",
      },
      {
        id: "ricostruzione",
        nome: "Ricostruzione",
        prezzoChf: 40,
        descrizione: "Ricostruzione unghie in gel",
      },
    ],
  },
  {
    id: "piedi",
    nome: "Piedi",
    opzioni: [
      {
        id: "piedi",
        nome: "Piedi",
        prezzoChf: 30,
        descrizione: "Cura e nail art per i piedi",
      },
    ],
  },
  {
    id: "mani-piedi",
    nome: "Mani + Piedi",
    opzioni: [
      {
        id: "mani-piedi",
        nome: "Mani + Piedi",
        prezzoChf: 70,
        descrizione: "Il trattamento completo",
      },
    ],
  },
];
