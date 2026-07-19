"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { comprimiImmagine } from "@/lib/image";
import {
  GALLERY_SERVICES,
  type GalleryDeleteResponse,
  type GalleryPhoto,
  type GalleryUpdateResponse,
  type GalleryUploadResponse,
} from "@/types/gallery";

interface GalleriaProps {
  fotoIniziali: GalleryPhoto[];
}

type Overlay =
  | { mode: "add"; file: File; anteprima: string }
  | { mode: "edit"; id: string; anteprima: string };

export function Galleria({ fotoIniziali }: GalleriaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<GalleryPhoto[]>(fotoIniziali);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [ovServizio, setOvServizio] = useState("");
  const [ovDescrizione, setOvDescrizione] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!overlay) return;

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (overlay!.mode === "add") URL.revokeObjectURL(overlay!.anteprima);
      setOverlay(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [overlay]);

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    setErrore(null);
    setOvServizio("");
    setOvDescrizione("");
    setOverlay({ mode: "add", file, anteprima: URL.createObjectURL(file) });
  }

  function apriModifica(f: GalleryPhoto) {
    setErrore(null);
    setOvServizio(f.servizio ?? "");
    setOvDescrizione(f.descrizione ?? "");
    setOverlay({ mode: "edit", id: f.id, anteprima: f.url });
  }

  function chiudiOverlay() {
    if (overlay?.mode === "add") URL.revokeObjectURL(overlay.anteprima);
    setOverlay(null);
  }

  async function handleElimina(id: string) {
    if (!window.confirm("Eliminare questa foto dal sito?")) return;

    setErrore(null);
    setEliminandoId(id);

    try {
      const res = await fetch("/api/admin/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json: GalleryDeleteResponse = await res.json();
      if (!json.ok) {
        setErrore(json.error || "Errore durante l'eliminazione.");
        return;
      }
      setFoto((prev) => prev.filter((f) => f.id !== id));
    } catch {
      setErrore("Errore di rete durante l'eliminazione. Riprova.");
    } finally {
      setEliminandoId(null);
    }
  }

  async function confermaOverlay() {
    if (!overlay) return;

    setErrore(null);
    setSalvando(true);

    try {
      if (overlay.mode === "add") {
        const formData = new FormData();
        formData.append("foto", await comprimiImmagine(overlay.file));
        formData.append("servizio", ovServizio);
        formData.append("descrizione", ovDescrizione);

        const res = await fetch("/api/admin/gallery", { method: "POST", body: formData });
        const json: GalleryUploadResponse = await res.json();
        if (!json.ok || !json.photo) {
          setErrore(json.error || "Errore durante il caricamento.");
          return;
        }
        setFoto((prev) => [...prev, json.photo!]);
      } else {
        const res = await fetch("/api/admin/gallery", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: overlay.id, servizio: ovServizio, descrizione: ovDescrizione }),
        });
        const json: GalleryUpdateResponse = await res.json();
        if (!json.ok || !json.photo) {
          setErrore(json.error || "Errore durante il salvataggio.");
          return;
        }
        setFoto((prev) => prev.map((p) => (p.id === overlay.id ? json.photo! : p)));
      }

      chiudiOverlay();
    } catch {
      setErrore(
        overlay.mode === "add"
          ? "Errore di rete durante il caricamento. Riprova."
          : "Errore di rete durante il salvataggio. Riprova."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      {errore && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {errore}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {foto.map((f) => (
          <div
            key={f.id}
            className="group relative aspect-square overflow-hidden rounded-2xl border border-stone-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt="" className="h-full w-full object-cover" />
            <div className="absolute right-1.5 top-1.5 flex gap-1.5">
              <button
                type="button"
                onClick={() => apriModifica(f)}
                aria-label="Modifica foto"
                className="rounded-full bg-white/90 p-1.5 text-stone-700 shadow-sm transition hover:bg-white"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleElimina(f.id)}
                disabled={eliminandoId === f.id}
                aria-label="Elimina foto"
                className="rounded-full bg-white/90 p-1.5 text-rose-700 shadow-sm transition hover:bg-white disabled:opacity-60"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        <label
          htmlFor="galleria-foto"
          className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-stone-300 text-stone-500 transition hover:border-coral-300 hover:text-coral-700"
        >
          <span className="text-2xl">+</span>
          <span className="text-xs">Aggiungi foto</span>
        </label>
        <input
          ref={inputRef}
          id="galleria-foto"
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>

      {foto.length === 0 && (
        <p className="text-sm text-stone-500">
          Nessuna foto ancora: il sito mostra dei segnaposto finché non ne
          aggiungi almeno una.
        </p>
      )}

      {overlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={chiudiOverlay}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-stone-700">
              {overlay.mode === "add" ? "Nuova foto" : "Modifica foto"}
            </p>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={overlay.anteprima}
              alt="Anteprima"
              className="max-h-64 w-full rounded-xl border border-stone-200 object-contain"
            />

            <div>
              <label htmlFor="overlay-servizio" className="block text-xs text-stone-500">
                Servizio (opzionale)
              </label>
              <select
                id="overlay-servizio"
                value={ovServizio}
                onChange={(e) => setOvServizio(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700"
              >
                <option value="">Non specificato</option>
                {GALLERY_SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="overlay-descrizione" className="block text-xs text-stone-500">
                Descrizione (opzionale)
              </label>
              <textarea
                id="overlay-descrizione"
                value={ovDescrizione}
                onChange={(e) => setOvDescrizione(e.target.value)}
                rows={3}
                placeholder="Es. Ricostruzione gel con french sfumata"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={confermaOverlay}
                disabled={salvando}
                className="flex-1 rounded-lg bg-coral-700 px-4 py-2 text-sm font-medium text-white hover:bg-coral-800 disabled:opacity-60"
              >
                {salvando
                  ? overlay.mode === "add"
                    ? "Caricamento…"
                    : "Salvataggio…"
                  : overlay.mode === "add"
                    ? "Carica"
                    : "Salva"}
              </button>
              <button
                type="button"
                onClick={chiudiOverlay}
                disabled={salvando}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
