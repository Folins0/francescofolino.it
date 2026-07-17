// Tipi per il flusso "Nuova settimana" del pannello admin:
// upload foto foglio turni -> lettura IA -> revisione umana -> pubblicazione.

/** Un singolo turno di lavoro letto (o corretto a mano) dal foglio turni. */
export interface Turno {
  /** Orario di inizio, formato "HH:MM". */
  inizio: string;
  /**
   * Orario di fine, formato "HH:MM".
   * Se nota_chiusura è true e l'IA non ha trovato un orario, può essere "".
   */
  fine: string;
  /** true se il foglio riporta "a chiusura" invece di un orario fisso. */
  nota_chiusura: boolean;
}

/** Un intervallo libero proposto (o corretto a mano) per le prenotazioni. */
export interface FasciaLibera {
  inizio: string; // "HH:MM"
  fine: string; // "HH:MM"
}

/** Un giorno della settimana così come restituito/rivisto per il foglio turni. */
export interface GiornoTurni {
  /** Data ISO, "YYYY-MM-DD". */
  data: string;
  turni: Turno[];
  /** true se "Grazia" non compare affatto in quel giorno (giorno libero). */
  libero_tutto_il_giorno: boolean;
  /** Note/asterischi vicino al nome, riportati così come letti, senza interpretarli. */
  note_flag: string[];
}

/** Corpo grezzo restituito dal modello IA (prima della revisione umana). */
export interface ShiftSheetAIResult {
  giorni: GiornoTurni[];
  /** true se l'IA segnala di non essere sicura della lettura (immagine poco chiara). */
  bassa_confidenza?: boolean;
  /** Eventuale nota libera dell'IA (es. parti illeggibili). */
  avviso?: string;
}

/** Riga di un giorno nella tabella di revisione admin, con le fasce libere calcolate/editate. */
export interface GiornoReview extends GiornoTurni {
  fasce_libere: FasciaLibera[];
}

export type ParseShiftSheetResponse =
  | {
      ok: true;
      weekId: string;
      shiftUploadId: string;
      giorni: GiornoTurni[];
      bassa_confidenza: boolean;
      avviso: string | null;
    }
  | {
      ok: false;
      error: string;
      /** Se presente, la settimana/riga upload sono comunque state create: si può correggere a mano. */
      weekId?: string;
    };

export interface PublishWeekPayload {
  weekId: string;
  shiftUploadId?: string;
  giorni: GiornoReview[];
}
