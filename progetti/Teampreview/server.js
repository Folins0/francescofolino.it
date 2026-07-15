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
            // Endpoint 2: Coaching Tattico
            else if (req.url === "/api/coach-advice") {
                const hash = generateHash(data.roster);
                if (cache.has(hash)) {
                    response = { advice: cache.get(hash) };
                } else {
                    const advice = await callGroqApi({
                        model: "llama-3.3-70b-versatile",
                        messages: [{ role: "user", content: `Sei un coach VGC esperto. Analizza questo roster e dai consigli tattici sintetici (massimo 4 frasi): ${JSON.stringify(data.roster)}` }]
                    });
                    response = { advice };
                    cache.set(hash, advice);
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
