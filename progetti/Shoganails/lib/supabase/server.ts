import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Client Supabase da usare in Server Component, Route Handler e Server
 * Action. Legge/scrive i cookie di sessione, quindi rispetta la RLS in base
 * all'utente autenticato (nessuna service role key qui).
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // In un Server Component puro il set può fallire: va bene,
            // il middleware si occupa di rinfrescare la sessione.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // vedi sopra
          }
        },
      },
    }
  );
}
