export interface GalleryPhoto {
  id: string;
  url: string;
}

export interface GalleryUploadResponse {
  ok: boolean;
  photo?: GalleryPhoto;
  error?: string;
}

export interface GalleryDeleteResponse {
  ok: boolean;
  error?: string;
}
