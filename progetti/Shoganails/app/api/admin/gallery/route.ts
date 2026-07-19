import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  GalleryDeleteResponse,
  GalleryPhoto,
  GalleryUpdateResponse,
  GalleryUploadResponse,
} from "@/types/gallery";

export const runtime = "nodejs";

const BUCKET = "galleria";
// Vercel rifiuta richieste con corpo oltre ~4.5MB prima ancora di eseguire
// questa funzione (limite fisso della piattaforma): restiamo ben sotto,
// il client comprime già la foto prima di inviarla (lib/image.ts).
const MAX_MB = 4;
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function publicUrl(supabase: ReturnType<typeof createClient>, path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<GalleryUploadResponse>(
      { ok: false, error: "Non autenticato." },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("foto");
  const servizioRaw = formData.get("servizio");
  const servizio =
    typeof servizioRaw === "string" && servizioRaw.trim() ? servizioRaw.trim() : null;
  const descrizioneRaw = formData.get("descrizione");
  const descrizione =
    typeof descrizioneRaw === "string" && descrizioneRaw.trim() ? descrizioneRaw.trim() : null;

  if (!(file instanceof File)) {
    return NextResponse.json<GalleryUploadResponse>(
      { ok: false, error: "Nessuna immagine ricevuta." },
      { status: 400 }
    );
  }

  const estensione = MIME_TO_EXT[file.type];
  if (!estensione) {
    return NextResponse.json<GalleryUploadResponse>(
      {
        ok: false,
        error: `Formato immagine non supportato (${file.type || "sconosciuto"}). Usa JPEG, PNG o WEBP.`,
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json<GalleryUploadResponse>(
      { ok: false, error: `L'immagine è troppo grande (max ${MAX_MB}MB).` },
      { status: 400 }
    );
  }

  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${estensione}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadErr) {
    return NextResponse.json<GalleryUploadResponse>(
      { ok: false, error: `Errore nel caricamento della foto: ${uploadErr.message}` },
      { status: 500 }
    );
  }

  const { data: ultimaFoto } = await supabase
    .from("gallery_photos")
    .select("ordine")
    .order("ordine", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordine = (ultimaFoto?.ordine ?? -1) + 1;

  const { data: row, error: insertErr } = await supabase
    .from("gallery_photos")
    .insert({ storage_path: path, ordine, servizio, descrizione })
    .select("id")
    .single();

  if (insertErr || !row) {
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json<GalleryUploadResponse>(
      { ok: false, error: `Errore database: ${insertErr?.message ?? "sconosciuto"}` },
      { status: 500 }
    );
  }

  const photo: GalleryPhoto = {
    id: row.id,
    url: publicUrl(supabase, path),
    servizio,
    descrizione,
  };
  return NextResponse.json<GalleryUploadResponse>({ ok: true, photo });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<GalleryUpdateResponse>(
      { ok: false, error: "Non autenticato." },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    servizio?: string | null;
    descrizione?: string | null;
  };

  if (!body.id) {
    return NextResponse.json<GalleryUpdateResponse>(
      { ok: false, error: "ID mancante." },
      { status: 400 }
    );
  }

  const servizio =
    typeof body.servizio === "string" && body.servizio.trim() ? body.servizio.trim() : null;
  const descrizione =
    typeof body.descrizione === "string" && body.descrizione.trim()
      ? body.descrizione.trim()
      : null;

  const { data: row, error: updateErr } = await supabase
    .from("gallery_photos")
    .update({ servizio, descrizione })
    .eq("id", body.id)
    .select("id, storage_path, servizio, descrizione")
    .single();

  if (updateErr || !row) {
    return NextResponse.json<GalleryUpdateResponse>(
      { ok: false, error: `Errore database: ${updateErr?.message ?? "foto non trovata"}` },
      { status: 500 }
    );
  }

  const photo: GalleryPhoto = {
    id: row.id,
    url: publicUrl(supabase, row.storage_path),
    servizio: row.servizio,
    descrizione: row.descrizione,
  };
  return NextResponse.json<GalleryUpdateResponse>({ ok: true, photo });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<GalleryDeleteResponse>(
      { ok: false, error: "Non autenticato." },
      { status: 401 }
    );
  }

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) {
    return NextResponse.json<GalleryDeleteResponse>(
      { ok: false, error: "ID mancante." },
      { status: 400 }
    );
  }

  const { data: row, error: fetchErr } = await supabase
    .from("gallery_photos")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json<GalleryDeleteResponse>(
      { ok: false, error: "Foto non trovata." },
      { status: 404 }
    );
  }

  await supabase.storage.from(BUCKET).remove([row.storage_path]);

  const { error: deleteErr } = await supabase
    .from("gallery_photos")
    .delete()
    .eq("id", id);

  if (deleteErr) {
    return NextResponse.json<GalleryDeleteResponse>(
      { ok: false, error: `Errore database: ${deleteErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json<GalleryDeleteResponse>({ ok: true });
}
