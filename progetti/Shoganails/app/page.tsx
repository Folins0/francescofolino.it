import Link from "next/link";
import { Instagram, Sparkles, MessageCircleHeart } from "lucide-react";
import { serviceCategories } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import ServiziAccordion from "@/components/ServiziAccordion";
import Galleria from "@/components/Galleria";

const INSTAGRAM_HANDLE = "_shoganai_2022";
const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;

async function getGalleria() {
  const supabase = createClient();
  const { data } = await supabase
    .from("gallery_photos")
    .select("id, storage_path")
    .order("ordine", { ascending: true });

  return (data ?? []).map((riga) => ({
    id: riga.id,
    url: supabase.storage.from("galleria").getPublicUrl(riga.storage_path).data
      .publicUrl,
  }));
}

export default async function HomePage() {
  const foto = await getGalleria();

  return (
    <main className="min-h-screen bg-marble-50 bg-marble-veins">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-marble-200/70 bg-marble-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-4 sm:max-w-2xl">
          <span className="font-display text-2xl font-semibold tracking-wide text-stone-800">
            Shoganails
          </span>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram Shoganails"
            className="rounded-full bg-white p-2 text-coral-700 shadow-sm ring-1 ring-marble-200"
          >
            <Instagram size={20} strokeWidth={1.75} />
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 pb-28 sm:max-w-2xl">
        {/* Hero */}
        <section className="pt-8 text-center sm:pt-12">
          <p className="mx-auto mb-3 inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-coral-700 ring-1 ring-coral-200">
            <Sparkles size={14} />
            Nail art fatto a mano, con cura
          </p>
          <h1 className="font-display text-3xl font-semibold leading-tight text-stone-800 sm:text-4xl">
            Le tue unghie,
            <br />
            un piccolo lusso quotidiano
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm text-stone-500 sm:text-base">
            Manicure e pedicure curate nei minimi dettagli. Scegli il
            servizio e richiedi un appuntamento: ti confermiamo tutto su
            WhatsApp.
          </p>
        </section>

        {/* Gallery */}
        <section className="mt-12 sm:mt-16">
          <h2 className="font-display text-xl font-semibold text-stone-800">
            Le nostre unghie
          </h2>
          {foto.length === 0 && (
            <p className="mt-1 text-sm text-stone-500">
              Presto qui trovi le foto reali dei lavori di Shoganails.
            </p>
          )}
          <Galleria foto={foto} />
        </section>

        {/* Servizi e prezzi */}
        <section className="mt-12 sm:mt-16">
          <h2 className="font-display text-xl font-semibold text-stone-800">
            Servizi e prezzi
          </h2>
          <div className="mt-4">
            <ServiziAccordion categorie={serviceCategories} />
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Prezzi in Franchi Svizzeri (CHF).
          </p>
          <Link
            href="/prenota"
            className="mt-6 hidden w-full items-center justify-center rounded-full bg-gradient-to-r from-coral-700 to-rose-700 px-6 py-4 font-display text-lg font-semibold text-white shadow-lg shadow-coral-200/60 transition active:scale-[0.98] sm:flex"
          >
            Prenota un appuntamento
          </Link>
        </section>

        {/* Instagram */}
        <section className="mt-12 sm:mt-16">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-2xl border border-marble-200 bg-white/70 px-5 py-4 transition active:scale-[0.98]"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-coral-700 to-rose-700 text-white">
                <Instagram size={18} />
              </span>
              <span>
                <span className="block font-display font-semibold text-stone-800">
                  @{INSTAGRAM_HANDLE}
                </span>
                <span className="block text-xs text-stone-500">
                  Seguici per gli ultimi lavori
                </span>
              </span>
            </span>
            <span className="text-coral-700">→</span>
          </a>
        </section>

        {/* Nota indirizzo */}
        <section className="mt-10 sm:mt-12">
          <div className="flex items-start gap-3 rounded-2xl bg-rose-50/70 px-5 py-4 ring-1 ring-rose-100">
            <MessageCircleHeart
              size={20}
              className="mt-0.5 shrink-0 text-rose-500"
            />
            <p className="text-sm text-stone-600">
              L&apos;indirizzo esatto ti verrà comunicato su WhatsApp dopo la
              conferma dell&apos;appuntamento.
            </p>
          </div>
        </section>
      </div>

      {/* CTA fissa mobile */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-marble-200 bg-marble-50/95 px-5 py-3 backdrop-blur sm:hidden">
        <Link
          href="/prenota"
          className="flex w-full items-center justify-center rounded-full bg-gradient-to-r from-coral-700 to-rose-700 px-6 py-3 font-display font-semibold text-white shadow-md active:scale-[0.98]"
        >
          Prenota un appuntamento
        </Link>
      </div>

      <footer className="hidden border-t border-marble-200 py-6 text-center text-xs text-stone-500 sm:block">
        © {new Date().getFullYear()} Shoganails
      </footer>
    </main>
  );
}
