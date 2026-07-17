"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Errore inatteso:", error);
  }, [error]);

  return (
    <html lang="it">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-marble-50 px-6 text-center">
          <p className="font-display text-xl text-stone-800">
            Qualcosa è andato storto.
          </p>
          <p className="max-w-sm text-sm text-stone-500">
            Riprova tra un attimo. Se il problema persiste, contatta chi si occupa del sito.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-coral-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-coral-800"
          >
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
