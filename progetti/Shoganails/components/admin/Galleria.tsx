"use client";

import { useRef, useState, type ChangeEvent } from "react";
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

export function Galleria({ fotoIniziali }: GalleriaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<GalleryPhoto[]>(fotoIniziali);
  const [servizio, setServizio] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [caricamento, setCaricamento] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editServizio, setEditServizio] = useState("");
  const [editDescrizione, setEditDescrizione] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    setErrore(null);
    setCaricamento(true);

    const formData = new FormData();
    formData.append("foto", await comprimiImmagine(file));
    formData.append("servizio", servizio);
    formData.append("descrizione", descrizione);

    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        body: formData,
      });
      const json: GalleryUploadResponse = await res.json();
      if (!json.ok || !json.photo) {
        setErrore(json.error || "Errore durante il caricamento.");
        return;
      }
      setFoto((prev) => [...prev, json.photo!]);
      setDescrizione("");
    } catch {
      setErrore("Errore di rete durante il caricamento. Riprova.");
    } finally {
      setCaricamento(false);
    }
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

  function apriModifica(f: GalleryPhoto) {
    setErrore(null);
    setEditingId(f.id);
    setEditServizio(f.servizio ?? "");
    setEditDescrizione(f.descrizione ?? "");
  }

  async function salvaModifica() {
    if (!editingId) return;

    setErrore(null);
    setSalvando(true);

    try {
      const res = await fetch("/api/admin/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          servizio: editServizio,
          descrizione: editDescrizione,
        }),
      });
      const json: GalleryUpdateResponse = await res.json();
      if (!json.ok || !json.photo) {
        setErrore(json.error || "Errore durante il salvataggio.");
        return;
      }
      setFoto((prev) => prev.map((p) => (p.id === editingId ? json.photo! : p)));
      setEditingId(null);
    } catch {
      setErrore("Errore di rete durante il salvataggio. Riprova.");
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

      <div>
        <label htmlFor="galleria-servizio" className="block text-sm font-medium text-stone-700">
          Servizio della prossima foto
        </label>
        <select
          id="galleria-servizio"
          value={servizio}
          onChange={(e) => setServizio(e.target.value)}
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
        <label htmlFor="galleria-descrizione" className="block text-sm font-medium text-stone-700">
          Descrizione (opzionale)
        </label>
        <textarea
          id="galleria-descrizione"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          rows={2}
          placeholder="Es. Ricostruzione gel con french sfumata"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700"
        />
      </div>

      {editingId && (
        <div className="space-y-3 rounded-2xl border border-coral-200 bg-coral-50/50 p-4">
          <p className="text-sm font-medium text-stone-700">Modifica foto</p>
          <div>
            <label htmlFor="modifica-servizio" className="block text-xs text-stone-500">
              Servizio
            </label>
            <select
              id="modifica-servizio"
              value={editServizio}
              onChange={(e) => setEditServizio(e.target.value)}
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
            <label htmlFor="modifica-descrizione" className="block text-xs text-stone-500">
              Descrizione (opzionale)
            </label>
            <textarea
              id="modifica-descrizione"
              value={editDescrizione}
              onChange={(e) => setEditDescrizione(e.target.value)}
              rows={3}
              placeholder="Es. Ricostruzione gel con french sfumata"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={salvaModifica}
              disabled={salvando}
              className="flex-1 rounded-lg bg-coral-700 px-4 py-2 text-sm font-medium text-white hover:bg-coral-800 disabled:opacity-60"
            >
              {salvando ? "Salvataggio…" : "Salva"}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              disabled={salvando}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
            >
              Annulla
            </button>
          </div>
        </div>
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
          <span className="text-2xl">{caricamento ? "…" : "+"}</span>
          <span className="text-xs">
            {caricamento ? "Caricamento…" : "Aggiungi foto"}
          </span>
        </label>
        <input
          ref={inputRef}
          id="galleria-foto"
          type="file"
          accept="image/*"
          onChange={handleChange}
          disabled={caricamento}
          className="hidden"
        />
      </div>

      {foto.length === 0 && (
        <p className="text-sm text-stone-500">
          Nessuna foto ancora: il sito mostra dei segnaposto finché non ne
          aggiungi almeno una.
        </p>
      )}
    </div>
  );
}
