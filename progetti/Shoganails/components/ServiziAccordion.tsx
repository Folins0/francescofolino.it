"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formattaDurata, type ServiceCategory } from "@/lib/services";

export default function ServiziAccordion({
  categorie,
}: {
  categorie: ServiceCategory[];
}) {
  const [apertaId, setApertaId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {categorie.map((categoria) => {
        if (categoria.opzioni.length === 1) {
          const opzione = categoria.opzioni[0];
          return (
            <div
              key={categoria.id}
              className="flex items-center justify-between rounded-2xl border border-marble-200 bg-white/70 px-5 py-4"
            >
              <div>
                <p className="font-display text-lg font-semibold text-stone-800">
                  {categoria.nome}
                </p>
                <p className="text-sm text-stone-500">{opzione.descrizione}</p>
                <p className="mt-0.5 text-xs text-stone-400">{formattaDurata(opzione.durataMinuti)}</p>
              </div>
              <p className="whitespace-nowrap font-display text-xl font-semibold text-coral-700">
                {opzione.prezzoChf} CHF
              </p>
            </div>
          );
        }

        const aperta = apertaId === categoria.id;
        const prezzoMinimo = Math.min(...categoria.opzioni.map((o) => o.prezzoChf));

        return (
          <div key={categoria.id} className="rounded-2xl border border-marble-200 bg-white/70">
            <button
              type="button"
              onClick={() => setApertaId(aperta ? null : categoria.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
              aria-expanded={aperta}
            >
              <p className="font-display text-lg font-semibold text-stone-800">
                {categoria.nome}
              </p>
              <span className="flex items-center gap-2">
                <span className="whitespace-nowrap font-display text-xl font-semibold text-coral-700">
                  da {prezzoMinimo} CHF
                </span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-stone-400 transition-transform ${
                    aperta ? "rotate-180" : ""
                  }`}
                />
              </span>
            </button>
            <div
              className="grid transition-all duration-200 ease-in-out"
              style={{ gridTemplateRows: aperta ? "1fr" : "0fr" }}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="space-y-3 border-t border-marble-200/70 px-5 py-4">
                  {categoria.opzioni.map((opzione) => (
                    <div key={opzione.id} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-stone-800">{opzione.nome}</p>
                        <p className="text-xs text-stone-500">{opzione.descrizione}</p>
                        <p className="mt-0.5 text-xs text-stone-400">{formattaDurata(opzione.durataMinuti)}</p>
                      </div>
                      <p className="whitespace-nowrap text-sm font-semibold text-coral-700">
                        {opzione.prezzoChf} CHF
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
