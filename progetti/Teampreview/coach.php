<?php
// coach.php — proxy verso l'API Groq (compatibile OpenAI) per l'assistente
// AI "Solana".
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

// Chiamata Groq comune a tutte le modalità sotto: stampa la risposta JSON
// (o l'errore) e termina, così non va duplicata la gestione curl/errori per
// ogni modalità.
function callGroqAndRespond($apiKey, $payload) {
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
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
$mode = $body['mode'] ?? 'team';

// Due modalità, stesso endpoint (nessuna cache qui: a differenza di
// server.js, coach.php gira su hosting condiviso senza processo persistente,
// quindi una cache in memoria non sopravviverebbe tra una richiesta e l'altra).
// - "team" (default, retrocompatibile): analisi generale del roster.
// - "autofill": giustifica in una frase un candidato già scelto in locale
//   (app.js: computeAutofillCandidates/handleAutoCompleteTeam).
if ($mode === 'autofill') {
    $context = $body['context'] ?? null;
    if (!$context) {
        http_response_code(400);
        echo json_encode(['error' => 'Contesto mancante.']);
        exit;
    }

    $systemPrompt = "Sei Solana, un'assistente esperta di Pokémon VGC (Regulation M-B, doubles) che parla come un'amica "
        . "appassionata, non come un manuale. Ti è già stato scelto, con dati reali (non da te), un Pokémon "
        . "candidato per completare il roster. Giustifica la scelta in una frase breve e concreta, in "
        . "italiano, con un tono naturale, colloquiale ed empatico, citando il suo nome. Non proporre "
        . "alternative e non inventare dati assenti dal contesto.";

    $userContent = "Contesto: " . json_encode($context);

    $payload = json_encode([
        'model' => 'llama3-8b-8192',
        'messages' => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userContent],
        ],
    ]);

    callGroqAndRespond($apiKey, $payload);
}

$roster = $body['roster'] ?? null;
$metaHints = $body['metaHints'] ?? [];

if (!is_array($roster) || count($roster) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Roster mancante o vuoto.']);
    exit;
}

$systemPrompt = "Sei Solana, un'assistente esperta di Pokémon VGC (Double Battles) che parla come un'amica "
    . "appassionata, non come un manuale. Analizza il roster fornito. Individua le principali debolezze di "
    . "tipo e la mancanza di meccaniche chiave (es. Speed Control, Fake Out, Redirect). Sii sintetica, diretta "
    . "e strategica (massimo 3-4 frasi). Regola fondamentale: basati ESCLUSIVAMENTE sui dati reali dei Pokémon, "
    . "non inventare MAI mosse, abilità, tipi o statistiche inesistenti. Usa un tono naturale, colloquiale ed "
    . "empatico, mai robotico o da manuale. Devi generare la risposta SEMPRE E SOLO in lingua italiana, usando "
    . "il vocabolario ufficiale italiano del gioco.";

// metaHints arriva già calcolato dal client (app.js: buildMetaHints), che
// incrocia le debolezze del team con META_USAGE_REGMB (meta-usage.js, lista
// statica curata a mano da Pikalytics). Qui non si inventa nulla: si passa
// solo per la formulazione del consiglio, con l'ordine esplicito di non
// citare Pokémon del meta al di fuori di questa lista.
$metaContext = is_array($metaHints) && count($metaHints) > 0
    ? "Debolezze di tipo del team sfruttate da Pokémon molto usati nel meta attuale (Pokemon Champions Reg. M-B): "
        . implode(", ", array_map(fn($h) => "{$h['type']} → {$h['name']} (#{$h['rank']} del meta)", $metaHints))
        . ". Se ha senso, avvisa l'utente citando questi Pokémon per nome. Non citarne altri: se non sono in "
        . "questa lista non sai se sono davvero usati nel meta attuale."
    : "Nessun dato sul meta attuale disponibile per questo roster: non citare nomi di Pokémon del meta.";

$payload = json_encode([
    'model' => 'llama3-8b-8192', // Groq, gratuito. Fallback: 'gpt-3.5-turbo' su https://api.openai.com/v1/chat/completions
    'messages' => [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => "Roster: " . json_encode($roster) . "\n" . $metaContext],
    ],
]);

callGroqAndRespond($apiKey, $payload);
