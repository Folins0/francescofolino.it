const MAX_DIMENSIONE = 1600;
const QUALITA_JPEG = 0.82;

/**
 * Ridimensiona/comprime un'immagine lato browser prima dell'upload.
 * Le funzioni serverless di Vercel rifiutano richieste sopra ~4.5MB (limite
 * fisso della piattaforma, non aggirabile dal codice): una foto da telefono
 * supera facilmente quella soglia, quindi va ridotta prima di partire.
 */
export async function comprimiImmagine(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scala = Math.min(1, MAX_DIMENSIONE / Math.max(bitmap.width, bitmap.height));
    const larghezza = Math.round(bitmap.width * scala);
    const altezza = Math.round(bitmap.height * scala);

    const canvas = document.createElement("canvas");
    canvas.width = larghezza;
    canvas.height = altezza;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, larghezza, altezza);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITA_JPEG)
    );
    if (!blob || blob.size >= file.size) return file;

    const nome = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
