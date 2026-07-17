"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AdminHeader({ email }: { email: string | null }) {
  const router = useRouter();
  const [uscendo, setUscendo] = useState(false);

  async function handleLogout() {
    setUscendo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
      <div>
        <p className="font-display text-lg text-stone-800">
          Pannello Shoganails
        </p>
        {email && <p className="text-xs text-stone-500">{email}</p>}
      </div>
      <button
        onClick={handleLogout}
        disabled={uscendo}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
      >
        {uscendo ? "Uscita…" : "Esci"}
      </button>
    </header>
  );
}
