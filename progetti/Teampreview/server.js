// server.js - Backend unificato con Gemini Flash 1.5 e Cache
require('dotenv').config();
const http = require("node:http");
const crypto = require("node:crypto");

const PORT = process.env.PORT || 8787;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ALLOWED_ORIGINS = ["https://francescofolino.it", "https://www.francescofolino.it"];
const isAllowedOrigin = (origin) => !!origin && (ALLOWED_ORIGINS.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));

// Verifica di sicurezza all'avvio
if (!GEMINI_API_KEY) {
    console.error("ERRORE: GEMINI_API_KEY non trovata nel file .env");
    process.exit(1);
}

const cache = new Map();
const generateHash = (data) => crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");

// Funzione helper per chiamare le API di Google
async function callGeminiApi(payload) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
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
                    const text = await callGeminiApi({
                        contents: [{ parts: [
                            { text: 'Individua i 6 Pokemon nello screenshot. Rispondi SOLO con questo formato JSON: {"pokemon": ["Nome1", "Nome2", "Nome3", "Nome4", "Nome5", "Nome6"]}' },
                            { inline_data: { mime_type: data.mimeType, data: data.imageBase64 } }
                        ]}],
                        generationConfig: { response_mime_type: "application/json" }
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
                    const advice = await callGeminiApi({
                        contents: [{ parts: [{ text: `Sei un coach VGC esperto. Analizza questo roster e dai consigli tattici sintetici (massimo 4 frasi): ${JSON.stringify(data.roster)}` }] }]
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