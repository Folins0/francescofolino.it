# TeamPreview — Fase 1

Team builder per Pokémon Champions VGC (Regulation M-B, doubles). Permette di
cercare un Pokémon tramite [PokéAPI](https://pokeapi.co) (con autocomplete e
suggerimento di correzione sui refusi) e aggiungerlo a un roster di 6 slot,
mostrando sprite, tipi e stat base. Si possono gestire fino a 6 team in
parallelo, ognuno con il proprio roster indipendente, condividerli tramite
un codice testuale generato dall'app stessa (vedi nota sotto), oppure
comporli automaticamente caricando 1-2 screenshot della schermata "team
preview" del gioco (OCR client-side, riconosce le 6 specie).

## Come avviarlo

Il progetto è statico (HTML/CSS/JS puro) e chiama PokéAPI direttamente dal
browser. Alcuni browser bloccano `fetch()` se apri `index.html` come file
locale (`file://`), quindi conviene servirlo con un server minimo:

```bash
cd Teampreview
python3 -m http.server 8000
```

Poi apri `http://localhost:8000` nel browser.

## Struttura

```
Teampreview/
├── index.html      # markup della pagina
├── style.css       # token di design (colori, tipografia, layout)
├── pokeapi.js      # wrapper attorno alle chiamate a PokéAPI
├── app.js          # stato dei team, rendering, gestione ricerca
└── README.md
```

I team (`teams` in `app.js`) vivono solo in memoria: si azzerano a ogni
refresh della pagina. È voluto — questa è la Fase 1.

## Roadmap (fasi successive)

### Fase 2 — Calcolo danni/matchup

Obiettivo: dato un Pokémon del roster attivo, una sua mossa e un Pokémon
avversario, mostrare il range di danno stimato in % di HP.

Assunzione di scope (da confermare): livello 50 (standard VGC), natura
neutra, 0 EV/31 IV per tutti — Fase 1 non salva EV/natura/livello per
Pokémon, quindi il calcolo userà le stat base così come sono già mostrate
nel roster. Un calcolo "vero" (con EV/natura reali) è rimandabile a
un'estensione successiva della scheda Pokémon, se serve più precisione.

1. **Matrice efficacia di tipo** — hardcodare la tabella 18×18 in
   `damage.js` (cambia raramente, evita 18 chiamate a `type/{id}` ogni
   volta). Funzione `typeEffectiveness(moveType, defenderTypes) -> number`
   (0, 0.25, 0.5, 1, 2, 4).
2. **Dati mossa** — fetch di `move/{name}` da PokéAPI per potenza, tipo,
   categoria (fisica/speciale/status). Il menu mosse di un Pokémon si
   popola dall'array `moves` già incluso nella risposta di
   `fetchPokemon()` (solo nomi: serve poi una fetch per mossa scelta,
   con cache in memoria per non richiamare PokéAPI ogni volta).
3. **Selettore avversario** — riusare l'UI di ricerca già esistente
   (stesso `fetchPokemon` + datalist), ma come slot singolo "avversario"
   fuori dai team, non aggiunto a un roster.
4. **Formula danno** (`js/damage.js`):
   `danno = ((2*Livello/5+2) * Potenza * Atk/Def / 50 + 2) * STAB * Tipo * random(0.85–1.00)`
   — STAB ×1.5 se la mossa condivide un tipo con l'attaccante, Tipo da
   step 1, Atk/Def da Attacco o Attacco Speciale in base alla categoria
   mossa. Output: danno minimo e massimo, convertiti in % dell'HP base
   del difensore.
5. **UI risultato** — sezione "Matchup" con attaccante (dal team attivo),
   mossa, avversario, e il range % risultante; eventualmente un
   indicatore visivo se il range supera il 100% (KO garantito) o è sotto
   una soglia bassa (mossa poco efficace).

Ordine consigliato: 1 → 2 → 4 (con dati finti) per validare la formula,
poi 3 e 5 per l'interfaccia completa.

### Fase 3 — Persistenza con MySQL
Backend leggero (Flask o FastAPI) con due tabelle indicative:

```sql
CREATE TABLE teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  pokemon_name VARCHAR(100) NOT NULL,
  slot_position TINYINT NOT NULL,      -- 1-6, l'ordine conta in doubles
  move_1 VARCHAR(100),
  move_2 VARCHAR(100),
  move_3 VARCHAR(100),
  move_4 VARCHAR(100),
  item VARCHAR(100),
  ability VARCHAR(100),
  nature VARCHAR(50),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);
```

Endpoint minimi: `POST /teams`, `GET /teams/:id`, `PUT /teams/:id`,
`DELETE /teams/:id`. Riusa lo stesso pattern CRUD già usato per
Osteria Folino / RistoLive.

### Fase 4 — Suggerimenti via prompt engineering (opzionale)
Un endpoint `POST /suggest` che, dato un "core" di squadra (es. 2-3
Pokémon fissi), costruisce un prompt strutturato per un LLM e restituisce
2-3 Pokémon complementari con una motivazione breve (copertura di tipo,
sinergia di abilità/Gravity/Trick Room, ecc.). È l'unico punto del
portfolio che dimostra concretamente la voce "Prompt Engineering".

### Fase 5 — Analisi del team avversario (opzionale)
Caricamento di una foto (screenshot della team preview) durante la scelta
del team: OCR/riconoscimento immagine per identificare i 6 Pokémon
avversari, poi analisi automatica per trovare il/i core della squadra
(coppie o trio ricorrenti con sinergie note, es. Rain+Swift Swim,
Trick Room+attaccanti lenti) e suggerire quali Pokémon del proprio roster
portare e quali lasciare in panchina. Probabilmente si appoggia a un
endpoint LLM (stesso stack di Fase 4) con il riconoscimento immagine
delegato a un servizio esterno o a un modello vision.

### Fase 6 — Sito in inglese (opzionale)
Toggle IT/EN come quello già presente nel portfolio principale
(`Portofolio/index.html`): attributi `data-it`/`data-en` su ogni testo
statico, un bottone che scambia `textContent` e salva la preferenza in
`localStorage`. I testi dinamici generati da `app.js` (nomi Pokémon, tipi,
messaggi di feedback) vanno tradotti a parte — i nomi Pokémon possono
restare in inglese/originale PokéAPI, sono già in inglese di default.

## Note

- **Screenshot import**: usa [Tesseract.js](https://tesseract.projectnaomi.com/)
  (OCR via WASM, caricato da CDN, nessun backend/API key) per leggere il testo
  degli screenshot, poi confronta ogni parola riconosciuta con l'elenco nomi
  di PokéAPI (soglia di distanza stretta, per non scambiare abilità/mosse/
  oggetti per specie). Riconosce solo le 6 specie, non abilità/oggetto/mosse/
  EV — il roster oggi non ha campi per quei dati né in import né in modalità
  manuale, servirebbe prima estendere il modello dati e la card del roster.
  L'accuratezza reale dipende dalla qualità/risoluzione dello screenshot; è
  stata testata con un'immagine sintetica (riconoscimento corretto), non
  ancora con uno screenshot reale del gioco.
- **Codice team**: è un formato inventato da TeamPreview (ID PokéAPI di ogni
  Pokémon in base36, tipo `ND-K7`), pensato per condividere un roster tra
  utenti dell'app o tra dispositivi. Non è compatibile con i codici
  "Replica Team" (Rental Team) di
  Pokémon Champions/Scarlatto e Violetto: quei codici fanno riferimento a
  dati salvati sui server Nintendo (non un blob autosufficiente decodificabile
  offline) e il formato non è mai stato pubblicato ufficialmente, quindi non
  c'è modo di leggerli o generarli da fuori dal gioco. Se serve tenere
  traccia del codice Replica Team reale di un roster, l'opzione più onesta è
  un campo di testo libero per appuntarlo accanto al team (nessuna
  decodifica, solo promemoria) — da valutare in Fase 2+.
- I colori dei badge tipo (`--type-fire`, `--type-water`, ecc. in
  `style.css`) seguono la palette convenzionale usata da quasi tutti i
  tool VGC/competitivi — non sono asset ufficiali Nintendo/Game Freak,
  solo codici colore.
- Gli sprite mostrati provengono dalle risposte di PokéAPI (che a sua
  volta li ospita da dataset pubblici); valuta se per una versione
  pubblica del sito preferisci sprite minimalisti generati da te per
  evitare qualunque dubbio sui diritti degli asset ufficiali.
