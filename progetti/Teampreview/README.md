# TeamPreview — Fase 2

Team builder per Pokémon Champions VGC (Regulation M-B, doubles). Permette di
cercare un Pokémon tramite [PokéAPI](https://pokeapi.co) (con autocomplete e
suggerimento di correzione sui refusi) e aggiungerlo a un roster di 6 slot,
mostrando sprite, tipi e stat base. Si possono gestire fino a 6 team in
parallelo, ognuno con il proprio roster indipendente, condividerli tramite
un codice testuale generato dall'app stessa (vedi nota sotto), oppure
comporli automaticamente caricando 1-2 screenshot della schermata "team
preview" del gioco (OCR client-side, riconosce le 6 specie).

Ogni Pokémon del roster può avere fino a 4 mosse, un oggetto tenuto, EV/IV
e natura (pannello "Statistiche" su ogni scheda), con stat finali calcolate
a Lv.50. Una sezione "Analisi matchup" mostra debolezze/resistenze del
roster attivo, la copertura offensiva del team in base alle mosse assegnate
e un calcolatore di danno tra un Pokémon del roster e un avversario cercato
al volo.

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
├── damage.js       # matrice tipi, nature, calcolo stat finali e danno
├── app.js          # stato dei team, rendering, gestione ricerca, modal, matchup
└── README.md
```

Lo stato dei team (`state` in `app.js`, un unico oggetto `{ teams, activeTeamIndex }`)
viene salvato in `localStorage` a ogni modifica del roster e ricaricato al
`DOMContentLoaded`: sopravvive al refresh, ma resta locale al browser. Un
backend condiviso multi-dispositivo resta compito della Fase 3.

## Fase 2 — mosse/oggetto/EV/IV/natura e analisi matchup (completata)

- Ogni Pokémon del roster (`mon` in `app.js`) porta ora `moves` (4 slot,
  selezionabili dal proprio `learnset` scaricato da PokéAPI), `item`
  (testo libero con autocomplete sugli oggetti PokéAPI), `ev`/`iv` (6
  stat ciascuno, validati 0–252/totale ≤510 e 0–31) e `nature` (25
  nature standard, effetto ±10% su una stat). Tutto modificabile dal
  pannello "Statistiche" di ogni scheda, che mostra anche le stat finali
  calcolate a **livello 50** con la formula standard (HP a parte).
- `damage.js` contiene la matrice di efficacia 18×18 (hardcoded, gen 6+),
  le 25 nature e le funzioni `calcStat`/`calcDamage`.
- La sezione "Analisi matchup" mostra, per ogni Pokémon del roster attivo,
  a quali tipi è debole/resistente/immune (doppio tipo combinato), la
  copertura offensiva del team (quali dei 18 tipi sono colpiti in modo
  super efficace da almeno una mossa assegnata, e quali no), e un
  calcolatore di danno min/max in % HP tra un Pokémon+mossa del roster e
  un avversario cercato al volo.
- **Assunzione sull'avversario**: non facendo parte di un roster (niente
  editor EV/IV/natura per lui), il calcolatore gli assume uno spread
  neutro (31 IV, 0 EV, natura neutra) a Lv.50 — coerente con la nota di
  scope già presente in Fase 1.
- Import da codice team e da screenshot restano limitati alla specie (le
  mosse/oggetto/EV/IV/natura dei Pokémon importati partono dai default e
  vanno impostate a mano); estendere quei formati è fuori scope qui.

## Roadmap (fasi successive)

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
