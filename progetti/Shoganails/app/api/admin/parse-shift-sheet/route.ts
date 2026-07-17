import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  readShiftSheet,
  ShiftSheetReadError,
  type ClaudeImageMediaType,
} from "@/lib/anthropic";
import { currentWeekDates } from "@/lib/week";
import { getOrCreateCurrentWeek } from "@/lib/weekDb";
import type { ParseShiftSheetResponse } from "@/types/shifts";

export const runtime = "nodejs";
export const maxDuration = 60;

// Formati accettati dall'API Claude. HEIC/HEIF (tipico di foto iPhone prese
// dalla galleria, non dallo scatto diretto) NON sono supportati: chiediamo
// di scegliere JPEG/PNG (es. impostando "Più compatibile" nelle impostazioni
// fotocamera dell'iPhone, oppure scattando direttamente dal form).
const MIME_TO_MEDIA_TYPE: Record<string, ClaudeImageMediaType> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ParseShiftSheetResponse>(
      { ok: false, error: "Non autenticato." },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("foto");

  if (!(file instanceof File)) {
    return NextResponse.json<ParseShiftSheetResponse>(
      { ok: false, error: "Nessuna immagine ricevuta." },
      { status: 400 }
    );
  }

  const mediaType = MIME_TO_MEDIA_TYPE[file.type];
  if (!mediaType) {
    const suggerimentoHeic =
      file.type === "image/heic" || file.type === "image/heif"
        ? " Le foto HEIC di iPhone non sono supportate: scatta la foto direttamente da qui oppure scegli \"Più compatibile\" nelle impostazioni fotocamera dell'iPhone."
        : "";
    return NextResponse.json<ParseShiftSheetResponse>(
      {
        ok: false,
        error: `Formato immagine non supportato (${file.type || "sconosciuto"}). Usa JPEG, PNG o WEBP.${suggerimentoHeic}`,
      },
      { status: 400 }
    );
  }

  // 1. Trova o crea la week per la settimana corrente.
  const weekResult = await getOrCreateCurrentWeek(supabase);
  if ("error" in weekResult) {
    return NextResponse.json<ParseShiftSheetResponse>(
      { ok: false, error: weekResult.error },
      { status: 500 }
    );
  }
  const weekId = weekResult.weekId;

  // 2. Carica la foto nello storage privato "foglio-turni".
  const bytes = new Uint8Array(await file.arrayBuffer());
  const estensione = file.type.split("/")[1] || "jpg";
  const path = `${weekId}/${Date.now()}.${estensione}`;

  const { error: uploadErr } = await supabase.storage
    .from("foglio-turni")
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadErr) {
    return NextResponse.json<ParseShiftSheetResponse>(
      { ok: false, error: `Errore nel caricamento della foto: ${uploadErr.message}`, weekId },
      { status: 500 }
    );
  }

  const urlImmagine = path; // path nel bucket privato; si genera un signed URL quando serve mostrarla

  // 3. Chiama il modello IA con visione.
  const weekDates = currentWeekDates();
  const base64Image = Buffer.from(bytes).toString("base64");

  let risultatoAI;
  try {
    risultatoAI = await readShiftSheet({ base64Image, mediaType, weekDates });
  } catch (err) {
    // Anche in caso di errore IA, salviamo comunque il riferimento
    // all'upload così l'admin può correggere tutto a mano.
    await supabase
      .from("shift_uploads")
      .insert({
        week_id: weekId,
        url_immagine: urlImmagine,
        dati_estratti_grezzi: { errore: String(err) },
        confermato: false,
      })
      .select("id")
      .single();

    const messaggio =
      err instanceof ShiftSheetReadError
        ? err.message
        : "Non è stato possibile leggere il foglio turni (immagine poco chiara o errore del servizio IA).";

    return NextResponse.json<ParseShiftSheetResponse>(
      {
        ok: false,
        error: messaggio,
        weekId,
      },
      { status: 422 }
    );
  }

  // 4. Salva l'output grezzo dell'IA.
  const { data: uploadRow, error: uploadRowErr } = await supabase
    .from("shift_uploads")
    .insert({
      week_id: weekId,
      url_immagine: urlImmagine,
      dati_estratti_grezzi: risultatoAI,
      confermato: false,
    })
    .select("id")
    .single();

  if (uploadRowErr || !uploadRow) {
    return NextResponse.json<ParseShiftSheetResponse>(
      {
        ok: false,
        error: `Errore database (salvataggio lettura IA): ${uploadRowErr?.message ?? "sconosciuto"}`,
        weekId,
      },
      { status: 500 }
    );
  }

  return NextResponse.json<ParseShiftSheetResponse>({
    ok: true,
    weekId,
    shiftUploadId: uploadRow.id,
    giorni: risultatoAI.giorni,
    bassa_confidenza: risultatoAI.bassa_confidenza ?? false,
    avviso: risultatoAI.avviso ?? null,
  });
}
