"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Errore pannello admin:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-marble-50 px-6 text-center">
      <p className="font-display text-xl text-stone-800">
        Il pannello non si è caricato correttamente.
      </p>
      <p className="max-w-sm text-sm text-stone-500">
        Riprova. Se continua a non funzionare, controlla la connessione o riprova più tardi.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-coral-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-coral-800"
      >
        Riprova
      </button>
    </div>
  );
}
