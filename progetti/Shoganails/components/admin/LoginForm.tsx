"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrore(null);
    setCaricamento(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setCaricamento(false);

    if (error) {
      setErrore(
        error.message.includes("Invalid login credentials")
          ? "Email o password non corrette."
          : `Errore di accesso: ${error.message}`
      );
      return;
    }

    const next = searchParams.get("next") || "/admin";
    router.push(next);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm"
    >
      <div>
        <h1 className="font-display text-2xl text-stone-800">
          Accesso pannello Shoganails
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Area riservata: accedi con le tue credenziali.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-stone-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="password"
          className="text-sm font-medium text-stone-700"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500"
        />
      </div>

      {errore && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {errore}
        </p>
      )}

      <button
        type="submit"
        disabled={caricamento}
        className="w-full rounded-lg bg-coral-700 px-4 py-2 font-medium text-white transition hover:bg-coral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {caricamento ? "Accesso in corso…" : "Accedi"}
      </button>
    </form>
  );
}
