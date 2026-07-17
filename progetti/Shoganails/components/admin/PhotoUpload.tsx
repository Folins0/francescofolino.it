"use client";

import { useRef, useState, type ChangeEvent } from "react";

interface PhotoUploadProps {
  onAnalizza: (file: File) => void;
  caricamento: boolean;
}

export function PhotoUpload({ onAnalizza, caricamento }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [anteprima, setAnteprima] = useState<string | null>(null);
  const [erroreFile, setErroreFile] = useState<string | null>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setErroreFile("Il file scelto non è un'immagine.");
      return;
    }
    const MAX_MB = 15;
    if (selected.size > MAX_MB * 1024 * 1024) {
      setErroreFile(`L'immagine è troppo grande (max ${MAX_MB}MB).`);
      return;
    }

    setErroreFile(null);
    setFile(selected);
    setAnteprima((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selected);
    });
  }

  function reset() {
    if (anteprima) URL.revokeObjectURL(anteprima);
    setFile(null);
    setAnteprima(null);
    setErroreFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
      <label htmlFor="foglio-turni-foto" className="block text-sm font-medium text-stone-700">
        Foto del foglio turni
      </label>
      <input
        ref={inputRef}
        id="foglio-turni-foto"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        disabled={caricamento}
        aria-describedby="foglio-turni-foto-help"
        className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-coral-50 file:px-3 file:py-2 file:text-coral-700 file:hover:bg-coral-100"
      />
      <p id="foglio-turni-foto-help" className="text-xs text-stone-500">
        Scatta una foto del foglio turni o scegline una dalla galleria. Cerca
        di inquadrarlo dritto e con buona luce.
      </p>

      {erroreFile && (
        <p role="alert" className="text-sm text-rose-700">
          {erroreFile}
        </p>
      )}

      {anteprima && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={anteprima}
          alt="Anteprima foglio turni"
          className="max-h-80 w-full rounded-xl border border-stone-200 object-contain"
        />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!file || caricamento}
          onClick={() => file && onAnalizza(file)}
          className="flex-1 rounded-lg bg-coral-700 px-4 py-2 font-medium text-white transition hover:bg-coral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {caricamento ? "Analisi in corso…" : "Analizza foglio turni"}
        </button>
        {file && !caricamento && (
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
          >
            Cambia foto
          </button>
        )}
      </div>
    </div>
  );
}
