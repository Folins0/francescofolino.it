// Backend: riconoscimento dei 6 Pokémon di una schermata team preview via
// Gemini 1.5 Flash (vision). Modulo Node.js (richiede fetch globale, Node >=18):
// nessuna dipendenza da installare, nessuna chiave hardcoded.
"use strict";

const crypto = require("node:crypto");

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const PROMPT = `Guarda questa schermata della team preview di un videogioco Pokémon.
Individua i 6 Pokémon mostrati e restituisci SOLO un JSON con questa forma esatta:
{"pokemon": ["Nome1", "Nome2", "Nome3", "Nome4", "Nome5", "Nome6"]}
Usa il nome della specie (es. "Incineroar", non forma/soprannome). Se uno slot è vuoto o illeggibile usa null.`;

// ponytail: cache in-memory per processo, azzerata al riavvio. Basta finché
// gira come singolo processo backend; se serve persistenza tra riavvii,
// passare a un cache store esterno (redis/file).
const cache = new Map();

function hashBytes(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function toBuffer(blob) {
  if (Buffer.isBuffer(blob)) return blob;
  if (blob instanceof Uint8Array) return Buffer.from(blob);
  if (blob && typeof blob.arrayBuffer === "function") {
    return Buffer.from(await blob.arrayBuffer());
  }
  throw new TypeError("analyzeScreenshot: blob deve essere un Buffer, Uint8Array o Blob/File.");
}

function normalizePokemonList(raw) {
  const list = Array.isArray(raw) ? raw.slice(0, 6) : [];
  while (list.length < 6) list.push(null);
  return list;
}

/**
 * Analizza uno screenshot della team preview e restituisce i nomi dei 6 Pokémon.
 * @param {Buffer|Uint8Array|Blob} blob - immagine dello screenshot
 * @param {{mimeType?: string}} [opts]
 * @returns {Promise<{pokemon: (string|null)[]}>}
 */
async function analyzeScreenshot(blob, opts = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY non impostata. Esporta la variabile d'ambiente con la tua API key Gemini prima di chiamare analyzeScreenshot()."
    );
  }

  const buffer = await toBuffer(blob);
  const cacheKey = hashBytes(buffer);
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const mimeType = opts.mimeType || blob.type || "image/png";
  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: buffer.toString("base64") } },
        ],
      },
    ],
    generationConfig: { response_mime_type: "application/json" },
  };

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Risposta Gemini senza contenuto testuale.");

  const parsed = JSON.parse(text);
  const result = { pokemon: normalizePokemonList(parsed.pokemon) };

  cache.set(cacheKey, result);
  return result;
}

module.exports = { analyzeScreenshot };
