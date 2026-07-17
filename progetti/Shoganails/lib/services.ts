// Dati statici dei servizi. In futuro questi valori saranno letti dalla
// tabella `services` su Supabase (vedi Prompt 2 in prompt-claude-code.md).
export type Service = {
  id: string;
  nome: string;
  prezzoChf: number;
  descrizione: string;
};

export const services: Service[] = [
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
  {
    id: "piedi",
    nome: "Piedi",
    prezzoChf: 30,
    descrizione: "Cura e nail art per i piedi",
  },
  {
    id: "mani-piedi",
    nome: "Mani + Piedi",
    prezzoChf: 70,
    descrizione: "Il trattamento completo",
  },
];
