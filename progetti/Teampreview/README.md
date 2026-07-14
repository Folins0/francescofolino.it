# TeamPreview — Fase 1

Team builder per Pokémon Champions VGC (Regulation M-B, doubles). Permette di
cercare un Pokémon tramite [PokéAPI](https://pokeapi.co) (con autocomplete e
suggerimento di correzione sui refusi) e aggiungerlo a un roster di 6 slot,
mostrando sprite, tipi e stat base. Si possono gestire fino a 6 team in
parallelo, ognuno con il proprio roster indipendente.

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
Aggiungere un modulo `js/damage.js` che implementi la formula ufficiale dei
danni Pokémon (livello, potenza mossa, Attacco/Difesa, STAB, efficacia di
tipo, modificatori random 85–100%). Input: un Pokémon del roster + un
Pokémon avversario + una mossa. Output: range di danno stimato in % di HP.
Le tabelle di efficacia di tipo si possono derivare dagli endpoint
`type/{id}` di PokéAPI, oppure hardcodare la matrice 18×18 (più veloce, dato
che cambia raramente).

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

## Note

- I colori dei badge tipo (`--type-fire`, `--type-water`, ecc. in
  `style.css`) seguono la palette convenzionale usata da quasi tutti i
  tool VGC/competitivi — non sono asset ufficiali Nintendo/Game Freak,
  solo codici colore.
- Gli sprite mostrati provengono dalle risposte di PokéAPI (che a sua
  volta li ospita da dataset pubblici); valuta se per una versione
  pubblica del sito preferisci sprite minimalisti generati da te per
  evitare qualunque dubbio sui diritti degli asset ufficiali.
