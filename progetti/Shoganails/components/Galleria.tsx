"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import GalleryPlaceholder from "@/components/GalleryPlaceholder";
import { GALLERY_SERVICES } from "@/types/gallery";

type Foto = { id: string; url: string; servizio: string | null; descrizione: string | null };

export default function Galleria({ foto: tutteLeFoto }: { foto: Foto[] }) {
  const [filtro, setFiltro] = useState<string | null>(null);
  const [indiceAperto, setIndiceAperto] = useState<number | null>(null);
  const [direzione, setDirezione] = useState<"avanti" | "indietro">("avanti");
  const [descrizioneAperta, setDescrizioneAperta] = useState(true);
  const touchStartX = useRef<number | null>(null);

  const serviziPresenti = useMemo(
    () => GALLERY_SERVICES.filter((s) => tutteLeFoto.some((f) => f.servizio === s.id)),
    [tutteLeFoto]
  );
  const foto = useMemo(
    () => (filtro ? tutteLeFoto.filter((f) => f.servizio === filtro) : tutteLeFoto),
    [tutteLeFoto, filtro]
  );

  const chiudi = useCallback(() => setIndiceAperto(null), []);
  const precedente = useCallback(() => {
    setDirezione("indietro");
    setIndiceAperto((i) => (i === null ? null : (i - 1 + foto.length) % foto.length));
  }, [foto.length]);
  const successiva = useCallback(() => {
    setDirezione("avanti");
    setIndiceAperto((i) => (i === null ? null : (i + 1) % foto.length));
  }, [foto.length]);

  useEffect(() => {
    if (indiceAperto === null) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") chiudi();
      if (e.key === "ArrowLeft") precedente();
      if (e.key === "ArrowRight") successiva();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [indiceAperto, chiudi, precedente, successiva]);

  useEffect(() => {
    setDescrizioneAperta(true);
  }, [indiceAperto]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) precedente();
      else successiva();
    }
    touchStartX.current = null;
  }

  if (tutteLeFoto.length === 0) {
    return (
      <div className="mt-4 grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <GalleryPlaceholder key={i} index={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      {serviziPresenti.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFiltro(null)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              filtro === null
                ? "bg-coral-700 text-white"
                : "bg-white text-stone-600 ring-1 ring-marble-200"
            }`}
          >
            Tutte
          </button>
          {serviziPresenti.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setFiltro(s.id)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                filtro === s.id
                  ? "bg-coral-700 text-white"
                  : "bg-white text-stone-600 ring-1 ring-marble-200"
              }`}
            >
              {s.nome}
            </button>
          ))}
        </div>
      )}

      {foto.length === 0 && (
        <p className="mt-4 text-sm text-stone-500">Nessuna foto per questo servizio.</p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3">
        {foto.map((f, i) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setIndiceAperto(i)}
            className="relative aspect-square overflow-hidden rounded-2xl shadow-sm"
            aria-label="Apri la foto a schermo intero"
          >
            <Image
              src={f.url}
              alt="Lavoro di nail art Shoganails"
              fill
              sizes="(max-width: 640px) 33vw, 25vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {indiceAperto !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4"
          onClick={chiudi}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={chiudi}
            aria-label="Chiudi"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white"
          >
            <X size={22} />
          </button>

          {foto.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                precedente();
              }}
              aria-label="Foto precedente"
              className="absolute left-2 z-10 rounded-full bg-white/10 p-2 text-white sm:left-4"
            >
              <ChevronLeft size={26} />
            </button>
          )}

          <div
            key={indiceAperto}
            className={`relative inline-block max-h-[85vh] ${
              direzione === "avanti"
                ? "motion-safe:animate-slide-in-right"
                : "motion-safe:animate-slide-in-left"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={foto[indiceAperto].url}
              alt="Lavoro di nail art Shoganails"
              width={1200}
              height={900}
              className="max-h-[85vh] w-auto rounded-xl object-contain"
            />

            {foto[indiceAperto].descrizione && (
              <div className="absolute inset-x-0 bottom-0">
                <div
                  className={`grid rounded-b-xl bg-gradient-to-t from-black/85 via-black/50 to-transparent transition-[grid-template-rows] duration-300 ease-out ${
                    descrizioneAperta ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-4 pb-3 pt-9 text-sm leading-relaxed text-white/90">
                      {foto[indiceAperto].descrizione}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDescrizioneAperta((v) => !v)}
                  aria-label={descrizioneAperta ? "Nascondi descrizione" : "Mostra descrizione"}
                  aria-expanded={descrizioneAperta}
                  className="absolute right-2 top-1.5 rounded-full bg-black/50 p-1.5 text-white transition hover:bg-black/70"
                >
                  <ChevronDown
                    size={18}
                    className={`transition-transform duration-300 ${descrizioneAperta ? "" : "rotate-180"}`}
                  />
                </button>
              </div>
            )}
          </div>

          {foto.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                successiva();
              }}
              aria-label="Foto successiva"
              className="absolute right-2 z-10 rounded-full bg-white/10 p-2 text-white sm:right-4"
            >
              <ChevronRight size={26} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
