// server.js - Backend unificato con Groq (Llama) e Cache
require('dotenv').config();
const http = require("node:http");
const crypto = require("node:crypto");

const PORT = process.env.PORT || 8787;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ALLOWED_ORIGINS = ["https://francescofolino.it", "https://www.francescofolino.it"];
const isAllowedOrigin = (origin) => !!origin && (ALLOWED_ORIGINS.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));

// Verifica di sicurezza all'avvio
if (!GROQ_API_KEY) {
    console.error("ERRORE: GROQ_API_KEY non trovata nel file .env");
    process.exit(1);
}

const cache = new Map();
const generateHash = (data) => crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Funzione helper per chiamare le API di Groq (formato OpenAI-compatibile).
// Se il servizio è sovraccarico (503), riprova una volta dopo una breve pausa.
async function callGroqApi(payload) {
    for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetch(GROQ_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            return data.choices[0].message.content;
        }

        const errorText = await response.text();
        if (response.status !== 503 || attempt === 1) {
            throw new Error(`Groq API error: ${response.status} - ${errorText}`);
        }
        await sleep(2000);
    }
}

const server = http.createServer(async (req, res) => {
    // CORS Headers
    if (isAllowedOrigin(req.headers.origin)) {
        res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
        try {
            const data = JSON.parse(body || "{}");
            let response = null;

            // Endpoint 1: Analisi Screenshot
            if (req.url === "/api/analyze-screenshot") {
                const hash = generateHash(data.imageBase64);
                if (cache.has(hash)) {
                    response = cache.get(hash);
                } else {
                    const text = await callGroqApi({
                        model: "meta-llama/llama-4-scout-17b-16e-instruct",
                        messages: [{
                            role: "user",
                            content: [
                                { type: "text", text: 'Individua i 6 Pokemon nello screenshot. Rispondi SOLO con questo formato JSON: {"pokemon": ["Nome1", "Nome2", "Nome3", "Nome4", "Nome5", "Nome6"]}' },
                                { type: "image_url", image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` } }
                            ]
                        }],
                        response_format: { type: "json_object" }
                    });
                    response = JSON.parse(text);
                    cache.set(hash, response);
                }
            }
            // Endpoint 2: Coaching Tattico. tre modalità, stessa cache in
            // memoria per tutte (hash diverso perché include sempre "mode"):
            // - "team" (default, retrocompatibile): analisi generale del roster.
            // - "contextual": consiglio mirato su ciò che l'utente sta guardando
            //   in questo momento (app.js: buildScreenContext/handleScreenAdvice).
            // - "autofill": giustifica in una frase un candidato già scelto in
            //   locale (app.js: computeAutofillCandidates/handleAutoCompleteTeam).
            else if (req.url === "/api/coach-advice") {
                const mode = data.mode || "team";

                if (mode === "contextual") {
                    // data.context arriva già calcolato dal client: solo fatti
                    // concreti su cosa l'utente sta guardando (stat base, mosse/
                    // oggetto/SP assegnati, o la vista d'insieme del roster).
                    const hash = generateHash({ mode, context: data.context });
                    if (cache.has(hash)) {
                        response = { advice: cache.get(hash) };
                    } else {
                        const advice = await callGroqApi({
                            model: "llama-3.3-70b-versatile",
                            messages: [
                                { role: "system", content: "Sei Solana, un'assistente esperta di Pokémon VGC (Regulation M-B, doubles) che parla come un'amica appassionata, non come un manuale. L'utente sta guardando una schermata specifica dell'app: dai un consiglio mirato e pratico su cosa manca in quella schermata (es. quali SP assegnare in base al ruolo suggerito dalle stat base, quale mossa o oggetto scegliere), in italiano, con un tono naturale, colloquiale ed empatico, massimo 3-4 frasi. IMPORTANTE: Pokémon Champions non usa gli EV classici (0-252 a stat, max 508 totali). Usa i \"SP\" (Stat Point): 0-32 per singola statistica, massimo 66 in totale su tutte le stat insieme. Se suggerisci uno spread, resta SEMPRE dentro questi limiti (es. \"32 SP in attacco e 32 in velocità\" è già il massimo assoluto per due stat, non puoi assegnarne di più). Basati ESCLUSIVAMENTE sui dati nel contesto fornito: non inventare mosse, abilità, tipi o statistiche non presenti." },
                                { role: "user", content: `Contesto schermata: ${JSON.stringify(data.context)}` }
                            ]
                        });
                        response = { advice };
                        cache.set(hash, advice);
                    }
                } else if (mode === "autofill") {
                    // Il candidato è già scelto in locale (tipi/copertura reali,
                    // non inventati dall'AI): qui si chiede solo la frase di
                    // giustificazione.
                    const hash = generateHash({ mode, context: data.context });
                    if (cache.has(hash)) {
                        response = { advice: cache.get(hash) };
                    } else {
                        const advice = await callGroqApi({
                            model: "llama-3.3-70b-versatile",
                            messages: [
                                { role: "system", content: "Sei Solana, un'assistente esperta di Pokémon VGC (Regulation M-B, doubles) che parla come un'amica appassionata, non come un manuale. Ti è già stato scelto, con dati reali (non da te), un Pokémon candidato per completare il roster. Giustifica la scelta in una frase breve e concreta, in italiano, con un tono naturale, colloquiale ed empatico, citando il suo nome. Non proporre alternative e non inventare dati assenti dal contesto." },
                                { role: "user", content: `Contesto: ${JSON.stringify(data.context)}` }
                            ]
                        });
                        response = { advice };
                        cache.set(hash, advice);
                    }
                } else {
                    // data.metaHints arriva già calcolato dal client (app.js:
                    // buildMetaHints), incrociando le debolezze del team con
                    // META_USAGE_REGMB (meta-usage.js). Qui non si inventa nulla:
                    // si passa solo all'LLM per la formulazione del consiglio.
                    const hash = generateHash({ mode, roster: data.roster, metaHints: data.metaHints });
                    if (cache.has(hash)) {
                        response = { advice: cache.get(hash) };
                    } else {
                        const metaHints = Array.isArray(data.metaHints) ? data.metaHints : [];
                        const metaContext = metaHints.length
                            ? `Debolezze di tipo del team sfruttate da Pokémon molto usati nel meta attuale (Pokemon Champions Reg. M-B): ${metaHints.map(h => `${h.type} → ${h.name} (#${h.rank} del meta)`).join(", ")}. Se ha senso, avvisa l'utente citando questi Pokémon per nome. Non citarne altri: se non sono in questa lista non sai se sono davvero usati nel meta attuale.`
                            : "Nessun dato sul meta attuale disponibile per questo roster: non citare nomi di Pokémon del meta.";
                        const advice = await callGroqApi({
                            model: "llama-3.3-70b-versatile",
                            messages: [
                                { role: "system", content: "Sei Solana, un'assistente esperta di Pokémon VGC (Regulation M-B, doubles) che parla come un'amica appassionata, non come un manuale. Analizza il roster e dai consigli tattici sintetici (massimo 4 frasi), in italiano, con un tono naturale, colloquiale ed empatico, mai robotico o da manuale. Basati ESCLUSIVAMENTE sui dati forniti: non inventare mai mosse, abilità, tipi o Pokémon del meta non elencati nel contesto." },
                                { role: "user", content: `Roster: ${JSON.stringify(data.roster)}\n${metaContext}` }
                            ]
                        });
                        response = { advice };
                        cache.set(hash, advice);
                    }
                }
            } else {
                res.writeHead(404); res.end(JSON.stringify({ error: "Endpoint non trovato" })); return;
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(response));
        } catch (err) {
            console.error("Errore server:", err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server unificato attivo su http://localhost:${PORT}`);
});
