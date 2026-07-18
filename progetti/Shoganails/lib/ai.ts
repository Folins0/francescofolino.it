import type { ShiftSheetAIResult, GiornoTurni, Turno } from "@/types/shifts";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Modello Groq con visione. Alternativa più accurata (ma più lenta/costosa):
// meta-llama/llama-4-maverick-17b-128e-instruct
const MODEL =
  process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

export class ShiftSheetReadError extends Error {}

function getApiKey() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new ShiftSheetReadError("GROQ_API_KEY non configurata sul server.");
  }
  return apiKey;
}

const SYSTEM_PROMPT = `Sei un assistente che legge foto di fogli turni di un negozio (spesso tabelle
scritte a mano o stampate, a volte fotografate storte o con luce scarsa).

Il tuo compito, per la persona chiamata "Grazia" (il nome può contenere piccoli
errori di lettura OCR o di battitura simili, es. "Grazia", "Grazi4", "Grasia"):

1. Identifica la settimana rappresentata nel foglio e i singoli giorni.
2. Per ogni giorno, estrai TUTTE le righe di turno presenti (orario di inizio,
   orario di fine, nome della persona associata alla riga).
3. Tieni SOLO le righe il cui nome corrisponde a "Grazia" (anche con piccole
   varianti/errori di lettura simili a "Grazia"). Ignora le righe di altre persone.
4. Se in un giorno "Grazia" non compare affatto in nessuna riga, quel giorno è
   un giorno completamente libero: segnalalo con libero_tutto_il_giorno = true
   e turni = [].
5. Se una riga riporta un orario di fine come "a chiusura" (o equivalenti tipo
   "chiusura", "fino a chiusura") invece di un orario preciso, imposta
   nota_chiusura = true per quel turno e lascia fine = "" (stringa vuota):
   NON inventare un orario.
6. Se vicino al nome "Grazia" compaiono asterischi o note scritte a mano
   (es. "*", "**", "vedi nota", ecc.), riportale testualmente nell'array
   note_flag di quel giorno, SENZA cercare di interpretarne il significato.
7. Se l'immagine è poco chiara, sfocata, tagliata o comunque non sei sicuro
   della lettura, imposta bassa_confidenza = true e spiega brevemente il
   problema nel campo avviso, ma restituisci comunque la lettura migliore che
   riesci a fare (mai bloccarti senza rispondere).

Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo, in questo
identico formato:

{
  "giorni": [
    {
      "data": "YYYY-MM-DD",
      "turni": [
        { "inizio": "HH:MM", "fine": "HH:MM", "nota_chiusura": false }
      ],
      "libero_tutto_il_giorno": false,
      "note_flag": []
    }
  ],
  "bassa_confidenza": false,
  "avviso": null
}

Se il foglio non riporta l'anno o le date esatte dei giorni, usa il tuo
miglior giudizio in base ai giorni della settimana indicati (lunedì...domenica)
e lascia comunque "data" nel formato YYYY-MM-DD, oppure, se davvero non è
possibile dedurla, usa una stringa vuota per "data" e spiegalo in "avviso".`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new ShiftSheetReadError(
      "La risposta dell'IA non contiene un JSON valido."
    );
  }
  const jsonSlice = trimmed.slice(start, end + 1);
  try {
    return JSON.parse(jsonSlice);
  } catch {
    throw new ShiftSheetReadError(
      "La risposta dell'IA non è un JSON leggibile."
    );
  }
}

function coerceTurno(raw: unknown): Turno {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    inizio: typeof r.inizio === "string" ? r.inizio : "",
    fine: typeof r.fine === "string" ? r.fine : "",
    nota_chiusura: Boolean(r.nota_chiusura),
  };
}

function coerceGiorno(raw: unknown): GiornoTurni {
  const r = (raw ?? {}) as Record<string, unknown>;
  const turniRaw = Array.isArray(r.turni) ? r.turni : [];
  return {
    data: typeof r.data === "string" ? r.data : "",
    turni: turniRaw.map(coerceTurno),
    libero_tutto_il_giorno: Boolean(r.libero_tutto_il_giorno),
    note_flag: Array.isArray(r.note_flag)
      ? r.note_flag.filter((n): n is string => typeof n === "string")
      : [],
  };
}

function coerceResult(raw: unknown): ShiftSheetAIResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const giorniRaw = Array.isArray(r.giorni) ? r.giorni : [];
  if (giorniRaw.length === 0) {
    throw new ShiftSheetReadError(
      "L'IA non ha trovato nessun giorno nel foglio caricato."
    );
  }
  return {
    giorni: giorniRaw.map(coerceGiorno),
    bassa_confidenza: Boolean(r.bassa_confidenza),
    avviso: typeof r.avviso === "string" ? r.avviso : undefined,
  };
}

/** Formati immagine accettati dal modello IA (visione). HEIC/HEIF (tipici di iPhone) NON sono supportati: vanno convertiti prima dell'invio. */
export type ClaudeImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

export interface ReadShiftSheetInput {
  base64Image: string;
  mediaType: ClaudeImageMediaType;
  /** Date ISO (YYYY-MM-DD) lunedì-domenica della settimana scelta (corrente o prossima), per aiutare l'IA a datare i giorni. */
  weekDates: string[];
}

/** Invia la foto del foglio turni al modello IA (visione, via Groq) e ritorna il risultato strutturato. */
export async function readShiftSheet(
  input: ReadShiftSheetInput
): Promise<ShiftSheetAIResult> {
  const apiKey = getApiKey();

  let response: Response;
  try {
    response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.mediaType};base64,${input.base64Image}`,
                },
              },
              {
                type: "text",
                text: `La settimana da datare va da ${input.weekDates[0]} (lunedì) a ${
                  input.weekDates[6]
                } (domenica). I 7 giorni sono, in ordine: ${input.weekDates.join(", ")}.
Leggi il foglio turni nella foto e rispondi con il JSON richiesto.`,
              },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    throw new ShiftSheetReadError(
      `Errore nel contattare il modello IA: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new ShiftSheetReadError(
      `Errore nel contattare il modello IA (${response.status}): ${bodyText}`
    );
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text) {
    throw new ShiftSheetReadError("Il modello IA non ha restituito testo.");
  }

  const parsed = extractJson(text);
  return coerceResult(parsed);
}
