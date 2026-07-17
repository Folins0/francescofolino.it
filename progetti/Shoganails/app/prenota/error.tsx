"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Errore pagina prenota:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-marble-50 px-6 text-center">
      <p className="font-display text-xl text-stone-800">
        Non riusciamo a caricare la pagina prenotazioni.
      </p>
      <p className="max-w-sm text-sm text-stone-500">
        Controlla la connessione e riprova. Se il problema continua, torna alla home.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-coral-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-coral-800"
        >
          Riprova
        </button>
        <Link
          href="/"
          className="rounded-full border border-stone-300 px-6 py-2.5 text-sm font-semibold text-stone-600 hover:bg-white"
        >
          Torna alla home
        </Link>
      </div>
    </main>
  );
}
