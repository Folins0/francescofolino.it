import type { BuonoRow } from "@/types/database";

/** Buono con il nome del servizio già risolto (per tipo="servizio"), per la UI admin. */
export interface BuonoConServizio extends BuonoRow {
  servizio_nome: string | null;
}

export interface BuoniListResponse {
  ok: boolean;
  buoni?: BuonoConServizio[];
  error?: string;
}

export interface BuonoCreateResponse {
  ok: boolean;
  buono?: BuonoConServizio;
  error?: string;
}

export interface BuonoUpdateResponse {
  ok: boolean;
  buono?: BuonoConServizio;
  error?: string;
}

export interface BuonoDeleteResponse {
  ok: boolean;
  error?: string;
}

/** Risposta della funzione Postgres verifica_buono(), chiamata via RPC dal form pubblico. */
export interface VerificaBuonoResult {
  valido: boolean;
  tipo: "valore" | "servizio" | null;
  valore_chf: number | null;
  servizio_nome: string | null;
  messaggio: string;
}
