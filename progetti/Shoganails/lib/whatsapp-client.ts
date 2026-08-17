"use client";

/**
 * Chiama /api/admin/whatsapp-link (che compone il messaggio lato server,
 * indirizzo e mappa inclusi — mai esposti nel bundle JS del browser, vedi
 * README) e apre il link WhatsApp ottenuto in una nuova scheda.
 *
 * Niente scheda vuota aperta in anticipo: su alcuni browser mobile restava
 * bloccata su "about:blank" invece di essere reindirizzata. La fetch è
 * rapida (stesso dominio) e window.open subito dopo l'await funziona sui
 * browser principali, essendo comunque diretta conseguenza del click.
 */
export async function apriWhatsapp(params: {
  tipo: "conferma" | "promemoria";
  telefono: string;
  nome: string;
  servizio: string;
  quando: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/admin/whatsapp-link?${query}`);
    const json = await res.json();

    if (!json.ok || !json.url) {
      return { ok: false, error: json.error || "Errore nella preparazione del messaggio." };
    }

    const aperta = window.open(json.url, "_blank", "noopener,noreferrer");
    if (!aperta) {
      return {
        ok: false,
        error: "Il browser ha bloccato l'apertura di WhatsApp. Riprova (o controlla il blocco popup).",
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Errore di rete. Riprova." };
  }
}
