import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Client Supabase con la service_role key: bypassa la RLS. SOLO uso
 * server-side (route handler), mai importato in codice che finisce nel
 * bundle del browser. Serve a leggere `push_subscriptions` per inviare le
 * notifiche push anche quando è una cliente anonima (senza sessione admin)
 * a innescare l'evento, cioè dopo aver inviato una richiesta da /prenota.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti nelle env var."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
