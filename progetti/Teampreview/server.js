// Backend minimo: espone POST /api/analyze-screenshot, che inoltra lo
// screenshot a Gemini (ai-vision.js) e risponde con i nomi riconosciuti.
// Un solo endpoint -> http nativo di Node basta, niente framework.
"use strict";

const http = require("node:http");
const { analyzeScreenshot } = require("./ai-vision.js");

const PORT = process.env.PORT || 8787;
// ponytail: CORS aperto, l'endpoint è read-only e non gestisce dati utente.
// Restringi ALLOWED_ORIGIN se in futuro passa a gestire dati sensibili.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB, ci sta largo uno screenshot compresso

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error("Payload troppo grande."));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("JSON non valido."));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/analyze-screenshot") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  try {
    const { imageBase64, mimeType } = await readJsonBody(req);
    if (!imageBase64) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "imageBase64 mancante." }));
      return;
    }

    const result = await analyzeScreenshot(Buffer.from(imageBase64, "base64"), { mimeType });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  } catch (err) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`ai-vision backend in ascolto su http://localhost:${PORT}`);
});
