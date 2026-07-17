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
    id: "mani",
    nome: "Mani",
    prezzoChf: 40,
    descrizione: "Cura e nail art per le mani",
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
