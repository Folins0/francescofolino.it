<?php
// coach.php — proxy verso l'API Groq (compatibile OpenAI) per l'assistente
// AI "Professoressa Pokémon" (Scout).
//
// ATTENZIONE: GitHub Pages serve solo file statici, non esegue PHP. Questo
// file va caricato su un server PHP separato (hosting condiviso, VPS...).
// Dopo il deploy, aggiorna l'URL nella fetch di coach.php in app.js da
// 'coach.php' all'URL assoluto del server, es. 'https://api.tuodominio.it/coach.php'.

// TODO: inserisci qui la tua API key Groq (https://console.groq.com/keys).
$apiKey = 'IL_TUO_API_KEY_QUI';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non consentito, usa POST.']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
$roster = $body['roster'] ?? null;

if (!is_array($roster) || count($roster) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Roster mancante o vuoto.']);
    exit;
}

$systemPrompt = "Sei un coach esperto di Pokémon VGC (Double Battles). Analizza il roster fornito. "
    . "Individua le principali debolezze di tipo e la mancanza di meccaniche chiave (es. Speed Control, "
    . "Fake Out, Redirect). Sii sintetico, diretto e strategico (massimo 3-4 frasi). Regola fondamentale: "
    . "basati ESCLUSIVAMENTE sui dati reali dei Pokémon, non inventare MAI mosse, abilità, tipi o statistiche "
    . "inesistenti. Usa un tono professionale ma da mentore.";

$payload = json_encode([
    'model' => 'llama3-8b-8192', // Groq, gratuito. Fallback: 'gpt-3.5-turbo' su https://api.openai.com/v1/chat/completions
    'messages' => [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => json_encode($roster)],
    ],
]);

$ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        "Authorization: Bearer {$apiKey}",
    ],
    CURLOPT_TIMEOUT => 30,
]);

$response = curl_exec($ch);
$curlError = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => "Errore di connessione a Groq: {$curlError}"]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => "Groq ha risposto con errore (HTTP {$httpCode}): {$response}"]);
    exit;
}

$data = json_decode($response, true);
$advice = $data['choices'][0]['message']['content'] ?? null;

if (!$advice) {
    http_response_code(502);
    echo json_encode(['error' => 'Risposta di Groq in un formato inatteso.']);
    exit;
}

echo json_encode(['advice' => $advice]);
