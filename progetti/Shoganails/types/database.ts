// Tipi TypeScript corrispondenti allo schema Supabase in
// supabase/migrations/0001_init.sql

export type WeekStatus = "bozza" | "pubblicata" | "chiusa";
export type SlotStatus = "libero" | "richiesto" | "confermato";
export type BookingStatus = "in_attesa" | "confermato" | "rifiutato";

export interface ServiceRow {
  id: string;
  nome: string;
  prezzo_chf: number;
  ordine_visualizzazione: number;
  descrizione: string | null;
}

export interface WeekRow {
  id: string;
  data_inizio: string; // date, YYYY-MM-DD
  data_fine: string; // date, YYYY-MM-DD
  stato: WeekStatus;
  creato_il: string; // timestamptz
}

export interface ShiftUploadRow {
  id: string;
  week_id: string;
  url_immagine: string;
  dati_estratti_grezzi: unknown; // jsonb, output IA grezzo
  confermato: boolean;
  creato_il: string;
}

export interface AvailableSlotRow {
  id: string;
  week_id: string;
  giorno: string; // date, YYYY-MM-DD
  ora_inizio: string; // time, HH:MM:SS
  ora_fine: string; // time, HH:MM:SS
  stato: SlotStatus;
}

export interface BookingRequestRow {
  id: string;
  slot_id: string;
  nome_cliente: string;
  telefono_cliente: string;
  service_id: string;
  orario_preferito: string | null;
  note: string | null;
  stato: BookingStatus;
  creato_il: string;
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  creato_il: string;
}

export interface GalleryPhotoRow {
  id: string;
  storage_path: string;
  ordine: number;
  creato_il: string;
}

export interface Database {
  public: {
    Tables: {
      services: {
        Row: ServiceRow;
        Insert: Partial<ServiceRow> & Pick<ServiceRow, "nome" | "prezzo_chf">;
        Update: Partial<ServiceRow>;
      };
      weeks: {
        Row: WeekRow;
        Insert: Partial<WeekRow> &
          Pick<WeekRow, "data_inizio" | "data_fine">;
        Update: Partial<WeekRow>;
      };
      shift_uploads: {
        Row: ShiftUploadRow;
        Insert: Partial<ShiftUploadRow> &
          Pick<ShiftUploadRow, "week_id" | "url_immagine">;
        Update: Partial<ShiftUploadRow>;
      };
      available_slots: {
        Row: AvailableSlotRow;
        Insert: Partial<AvailableSlotRow> &
          Pick<AvailableSlotRow, "week_id" | "giorno" | "ora_inizio" | "ora_fine">;
        Update: Partial<AvailableSlotRow>;
      };
      booking_requests: {
        Row: BookingRequestRow;
        Insert: Partial<BookingRequestRow> &
          Pick<
            BookingRequestRow,
            "slot_id" | "nome_cliente" | "telefono_cliente" | "service_id"
          >;
        Update: Partial<BookingRequestRow>;
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: Partial<PushSubscriptionRow> &
          Pick<PushSubscriptionRow, "endpoint" | "p256dh" | "auth">;
        Update: Partial<PushSubscriptionRow>;
      };
      gallery_photos: {
        Row: GalleryPhotoRow;
        Insert: Partial<GalleryPhotoRow> & Pick<GalleryPhotoRow, "storage_path">;
        Update: Partial<GalleryPhotoRow>;
      };
    };
  };
}
