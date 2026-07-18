export interface GalleryPhoto {
  id: string;
  url: string;
  servizio: string | null;
}

// Servizi disponibili per taggare le foto della galleria (usato dal select
// nell'upload admin e dai filtri in home page). Elenco libero: aggiungine
// uno se serve, non richiede migrazioni (il campo `servizio` è testo libero).
export const GALLERY_SERVICES = [
  { id: "semipermanente", nome: "Semipermanente" },
  { id: "ricostruzione", nome: "Ricostruzione" },
  { id: "piedi", nome: "Piedi" },
] as const;

export interface GalleryUploadResponse {
  ok: boolean;
  photo?: GalleryPhoto;
  error?: string;
}

export interface GalleryDeleteResponse {
  ok: boolean;
  error?: string;
}
