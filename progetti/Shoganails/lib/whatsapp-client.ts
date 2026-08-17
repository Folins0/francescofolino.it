"use client";

/**
 * Apre subito una scheda vuota (nello stesso "tick" del click, per evitare
 * che il browser blocchi il popup) e ci carica il link WhatsApp preparato
 * lato server da /api/admin/whatsapp-link — che aggiunge indirizzo e mappa
 * senza mai esporli nel bundle JS del browser (sono letti da una env var
 * server-only, vedi README).
 */
export async function apriWhatsapp(params: {
  tipo: "conferma" | "promemoria";
  telefono: string;
  nome: string;
  servizio: string;
  quando: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const finestra = window.open("", "_blank", "noopener,noreferrer");

  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/admin/whatsapp-link?${query}`);
    const json = await res.json();

    if (!json.ok || !json.url) {
      finestra?.close();
      return { ok: false, error: json.error || "Errore nella preparazione del messaggio." };
    }

    if (finestra) finestra.location.href = json.url;
    else window.open(json.url, "_blank", "noopener,noreferrer");

    return { ok: true };
  } catch {
    finestra?.close();
    return { ok: false, error: "Errore di rete. Riprova." };
  }
}
