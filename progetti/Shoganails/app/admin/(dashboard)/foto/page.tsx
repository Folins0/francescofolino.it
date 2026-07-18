import { createClient } from "@/lib/supabase/server";
import { Galleria } from "@/components/admin/Galleria";
import type { GalleryPhoto } from "@/types/gallery";

async function getGalleria(
  supabase: ReturnType<typeof createClient>
): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, storage_path, servizio")
    .order("ordine", { ascending: true });

  if (error || !data) return [];

  return data.map((riga) => ({
    id: riga.id,
    url: supabase.storage.from("galleria").getPublicUrl(riga.storage_path).data
      .publicUrl,
    servizio: riga.servizio,
  }));
}

export default async function FotoPage() {
  const supabase = createClient();
  const fotoGalleria = await getGalleria(supabase);

  return (
    <section>
      <h2 className="font-display text-xl text-stone-800">Foto del sito</h2>
      <p className="mt-1 text-sm text-stone-500">
        Le foto qui sotto sono quelle che le clienti vedono nella sezione
        &quot;Le nostre unghie&quot; della home page.
      </p>
      <div className="mt-4">
        <Galleria fotoIniziali={fotoGalleria} />
      </div>
    </section>
  );
}
