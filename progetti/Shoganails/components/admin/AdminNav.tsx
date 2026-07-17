"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Richieste" },
  { href: "/admin/calendario", label: "Calendario" },
  { href: "/admin/settimana", label: "Nuova settimana" },
  { href: "/admin/foto", label: "Foto del sito" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 sm:px-6">
        {TABS.map((tab) => {
          const attivo =
            tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition ${
                attivo
                  ? "border-coral-700 text-coral-700"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
