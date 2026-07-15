# Prossimi passi — prompt pronti per sessioni Claude Code separate

Raggruppamento dei problemi/richieste per area, con un prompt autosufficiente per
ognuno (ogni sessione Claude Code parte senza memoria di questa conversazione,
quindi ogni prompt ripete il contesto necessario). Nessuna modifica è stata fatta
qui: solo organizzazione.

**Nota su file condivisi**: `app.js`, `scout.js`, `scout.css` e `index.html` sono
toccati da più gruppi qui sotto (è un progetto senza framework, i file sono pochi
e grandi). Se apri più sessioni in parallelo su gruppi che condividono un file,
rischi conflitti — meglio farle girare in sequenza, o come minimo salvare/commitare
tra una sessione e l'altra. In particolare **Sessione 1/2** e **Sessione 7** toccano
entrambe scout.js/scout.css: non farle girare insieme.

---

## Sessione 1 — Menu assistente + azioni base (locali)

```
Lavoro su TeamPreview, un team builder VGC per Pokémon Champions (Regulation M-B,
doubles) — sito statico HTML/CSS/JS vanilla, nessun framework, dati da PokéAPI.
L'assistente "Scout" (Professoressa Pokémon, overlay in basso a destra: scout.js +
scout.css, markup in index.html dentro #overlay-scout) oggi, se la sprite viene
toccata, esegue direttamente handleCoachAnalysis() (in app.js, cerca
"--- Assistente AI"), che manda il roster attivo (activeTeam().mons, stato globale
`state` in app.js) al backend (server.js, endpoint POST /api/coach-advice, Groq
llama-3.3-70b-versatile) e mostra la risposta nel fumetto di Scout con Scout.say().

Esiste già meta-usage.js: una lista statica dei 25 Pokémon più usati nel meta
attuale (Pokemon Champions Reg. M-B), con {rank, slug, name}, aggiornata a mano da
Pikalytics (nessuna API pubblica di usage stats disponibile). In app.js c'è già
buildMetaHints(mons), che incrocia le debolezze del team con questa lista.

TASK: trasforma il tocco sulla sprite di Scout da azione diretta a un piccolo menu
di scelta (es. lista di bottoni che appare vicino alla sprite/nel fumetto quando la
tocchi). Il menu deve avere queste opzioni:
1. "Analizza il team" — stesso comportamento di handleCoachAnalysis() già esistente,
   non toccare la logica.
2. "Mostra utilizzo nel meta" — NUOVA, 100% locale, NESSUNA chiamata AI: per ogni
   Pokémon del roster attivo che compare in META_USAGE_REGMB, mostra il suo rank
   (es. "Garchomp è il #1 del meta attuale"); per quelli assenti dalla lista, dillo
   chiaramente ("non è tra i 25 più usati del meta attuale" o simile). Mostra il
   risultato con Scout.say() come le altre risposte.
3 e 4. "Consigli su questa schermata" e "Completa il team automaticamente" — questi
   due arriveranno (o stanno arrivando in parallelo) in un'altra sessione dedicata.
   Aggiungi le voci di menu e collegale a due funzioni placeholder (anche solo uno
   Scout.say("Funzione in arrivo") se non trovi già le funzioni reali nel codice),
   così l'altra sessione può agganciarle senza dover ritoccare il menu.

VINCOLI:
- Non rompere il bottone "Chiedi alla Professoressa" (id btn-coach, nella sezione
  Analisi matchup): deve continuare a chiamare handleCoachAnalysis() direttamente,
  il menu è SOLO per il tocco sulla sprite.
- Roster vuoto: mantieni il comportamento già esistente (avviso invece di procedere).
- Stile del progetto: commenti in italiano, spiega le scelte non ovvie con un
  commento breve, coerenza visiva con scout.css esistente (palette, bordi, font
  già usati nel resto del sito, vedi variabili CSS in style.css).

File coinvolti: scout.js, scout.css, index.html, app.js.
```

---

## Sessione 2 — Consigli contestuali AI + autofill team

```
Lavoro su TeamPreview, un team builder VGC per Pokémon Champions (Regulation M-B,
doubles) — sito statico HTML/CSS/JS vanilla, dati da PokéAPI. L'assistente "Scout"
(scout.js/scout.css, overlay #overlay-scout in index.html) mostra risposte con
Scout.say(testo). Il roster attivo è activeTeam().mons (stato globale `state` in
app.js). Il backend è server.js (Node, endpoint POST /api/coach-advice verso Groq,
con cache in memoria basata su hash del payload) e in parallelo coach.php (stesso
scopo, deploy alternativo su hosting PHP — se lo modifichi, aggiorna anche questo
per coerenza). Esiste già meta-usage.js con i 25 Pokémon più usati nel meta
(META_USAGE_REGMB) e funzioni in app.js per calcolare debolezze di tipo del team
(computeTeamWeakTypes) e copertura offensiva (vedi renderCoverage).

Un'altra sessione (parallela o già fatta) sta aggiungendo un menu al tocco della
sprite di Scout con delle voci; se non trovi ancora questo menu nel codice, aggiungi
comunque le funzioni sotto e un modo provvisorio per richiamarle (es. un bottone
temporaneo), così l'altra sessione può agganciarle dopo senza conflitti.

TASK 1 — "Consigli su questa schermata" (context-aware):
Quando l'utente lo chiede, Scout deve capire cosa l'utente sta guardando/modificando
in quel momento (es. il pannello Statistiche aperto per un Pokémon specifico, con
EV non ancora assegnati, o mosse mancanti, o oggetto vuoto) e dare un consiglio
mirato (es. "non so che EV mettere" → suggerire uno spread ragionevole in base al
ruolo/stat base del Pokémon). Prima di chiamare l'AI, calcola LOCALMENTE più
contesto possibile (stat base, tipo, mosse già assegnate, cosa manca nello slot
aperto) e manda quello al backend — non un prompt generico "aiutami". Stesso
pattern già usato per gli hint meta in buildMetaHints()/handleCoachAnalysis().
Estendi /api/coach-advice in server.js (e coach.php) con una modalità "contextual"
che accetta questo contesto pre-calcolato, o crea un endpoint dedicato se più
pulito — a tua scelta, ma riusa la cache esistente basata su hash invece di
duplicarla.

TASK 2 — "Completa il team automaticamente" (autofill):
Riempi gli slot vuoti del roster attivo. Prova PRIMA un approccio locale/
deterministico: filtra META_USAGE_REGMB per Pokémon che coprano i tipi scoperti/le
debolezze del team già in roster (riusa la logica di coverage/weak-types già
scritta, non duplicarla), poi usa l'AI solo per scegliere tra le opzioni già
filtrate localmente o per giustificare la scelta in una frase — coerente con
l'approccio "ibrido, risparmia richieste AI" già seguito nel resto del progetto
(vedi i commenti in app.js sopra buildMetaHints). Prima di aggiungere Pokémon al
roster, chiedi conferma all'utente (riusa il pattern confirm-box già presente nel
flusso di ricerca in index.html/app.js) invece di modificare lo stato senza
chiedere.

VINCOLI: commenti in italiano, non duplicare logica già scritta (weak types,
coverage, cache backend), rispetta MAX_TEAM_SIZE (6) e non superare gli slot
disponibili.

File probabilmente coinvolti: app.js, server.js, coach.php, meta-usage.js (solo
lettura), damage.js (letto per coverage/weak types).
```

---

## Sessione 3 — Tabella matchup: intestazioni fisse, tipi abbreviati, nomi non troncati

```
Lavoro su TeamPreview, un team builder VGC (HTML/CSS/JS vanilla). La sezione
"Analisi matchup" (index.html, classe .matchup) mostra una tabella generata da
buildMatchupTable(mons) in app.js: righe = i 18 tipi Pokémon, colonne = i Pokémon
del roster attivo, celle = efficacia (debole/resiste/immune). Con roster pieno o
schermi piccoli la tabella scorre ma si perde il riferimento a quale riga/colonna
si sta guardando. Ci sono altri tre problemi collegati alla stessa area:

TASK 1 — Intestazioni fisse durante lo scroll: la tabella deve restare scorribile
(orizzontalmente e verticalmente se serve), ma la prima colonna (nomi dei tipi) e
la prima riga (sprite/nomi dei Pokémon) devono restare fisse mentre si scorre, così
non ci si perde. Usa `position: sticky` su thead/prima colonna con un contenitore
a scroll (overflow: auto), non JavaScript per il fissaggio. Attenzione alla cella
in alto a sinistra (angolo tra riga e colonna fisse): deve restare fissa su
ENTRAMBI gli assi, con uno z-index adeguato per non finire sotto le altre celle.

TASK 2 — Tipi abbreviati a 3 lettere: oggi i badge di tipo mostrano il nome intero
(es. "fire", "dragon" — sono gli slug inglesi restituiti da PokéAPI, usati così
internamente). Abbreviali a 3 lettere maiuscole (es. fire→FIR, dragon→DRG,
water→WAT, electric→ELE...). Crea TU la mappa completa per i 18 tipi (normal,
fire, water, electric, grass, ice, fighting, poison, ground, flying, psychic, bug,
rock, ghost, dragon, dark, steel, fairy), controllando che le sigle risultino
distinguibili tra loro (es. non far coincidere due tipi diversi sulla stessa
sigla). Applica l'abbreviazione OVUNQUE compaiano badge di tipo nel sito — cerca
dove viene usata la funzione/stile `typeBadgeStyle` o simili in app.js, non solo
nella tabella matchup (controlla anche la sezione "Copertura offensiva del team" e
il calcolatore danno). Usa UNA sola funzione di utility condivisa per la mappa,
non duplicarla in più punti del file. Se serve, mantieni il nome completo in un
attributo `title`/tooltip per accessibilità.

TASK 3 — Nomi Pokémon troncati: in alcuni punti del roster i nomi vengono tagliati
(overflow) su schermi stretti. Trova dove succede (probabile `overflow: hidden` +
`white-space: nowrap` + larghezza fissa troppo stretta in style.css) e correggi:
preferisci colonne/contenitori che si allargano quanto serve, o testo che va a capo
in modo pulito, invece di un'ellissi che nasconde il nome.

File coinvolti: app.js (buildMatchupTable e funzione condivisa per i badge di
tipo), style.css.
```

---

## Sessione 4 — Rimuovi la funzione "codice team"

```
Lavoro su TeamPreview, un team builder VGC (HTML/CSS/JS vanilla, niente backend
dati — tutto in localStorage). Nella sezione .matchup di index.html c'è un pannello
.team-code-panel con: input #team-code-input, bottoni #team-code-import-btn
("Importa come nuovo team") e #team-code-export-btn ("Copia codice del team
attivo"), messaggio di feedback #team-code-feedback. In app.js ci sono le funzioni
collegate a questi id (cerca "team-code" o "TeamCode") che generano/decodificano un
formato testuale proprietario (NON il codice "Replica Team" ufficiale del gioco —
vedi la nota in fondo al README.md sotto "Codice team" per il contesto). Il README
documenta questa feature nella sezione Struttura/Note.

TASK: rimuovi completamente questa feature.
- index.html: elimina il markup di .team-code-panel.
- app.js: elimina le funzioni e i listener collegati (import/export/generazione
  codice), senza lasciare riferimenti orfani a id che non esistono più.
- style.css: elimina le regole dedicate (cerca `.team-code`).
- README.md: rimuovi o aggiorna la sezione che descrive questo formato, non
  lasciare riferimenti a una feature che non esiste più (puoi anche solo togliere
  il paragrafo nelle Note, a tua discrezione, purché il file resti coerente).

Prima di cancellare, verifica che nessun'altra parte del sito dipenda da queste
funzioni: l'import da screenshot (orchestrator.js, ai-vision.js) usa un percorso
diverso e NON dovrebbe c'entrare, ma controlla comunque con una ricerca testuale
nel repo prima di procedere.

File coinvolti: index.html, app.js, style.css, README.md.
```

---

## Sessione 5 — Grafica del calcolatore danno

```
Lavoro su TeamPreview, un team builder VGC (HTML/CSS/JS vanilla). La sezione
"Calcolatore danno" (.damage-calc dentro .matchup in index.html) ha: select
attaccante/mossa (#dmg-attacker-select, #dmg-move-select), input avversario
(#dmg-defender-input), radio per scegliere tra "range automatico" e "spread
personalizzato" (con pannello dettagli #dmg-defender-custom), bottone di calcolo
(#dmg-calc-btn) e risultato testuale in #dmg-result. La logica è in app.js (cerca
"dmgCalcBtn.addEventListener" e le funzioni renderAttackerOptions/renderMoveOptions
attorno) — NON toccare questa logica, solo l'aspetto.

TASK: migliora la grafica di questa sezione, oggi un form molto grezzo. Idee da
valutare (non tutte obbligatorie, usa giudizio):
- Layout più chiaro tra i controlli di input e il risultato (che oggi è solo
  testo semplice in #dmg-result) — dai più enfasi visiva al risultato del danno,
  es. con una barra percentuale colorata o un box con range min-max ben leggibile
  invece di una riga di testo piatta.
- Spaziatura/allineamento coerente con il resto del sito: guarda i design token
  già definiti in cima a style.css (colori, font, border-radius, spacing) e
  riusa quelli, non introdurne di nuovi.
- Separazione visiva più netta tra "range automatico (min-max su tutti gli SP
  possibili)" e "spread personalizzato" (oggi sono due semplici radio button
  senza gerarchia visiva chiara).

VINCOLI: mantieni la struttura HTML esistente il più possibile — gli id sono usati
da app.js, non rinominarli senza aggiornare anche app.js di conseguenza (preferisci
non toccarli affatto se possibile, limitandoti a wrapper/classi aggiuntive).

File coinvolti: style.css, eventuali piccoli aggiustamenti di markup in index.html.
```

---

## Sessione 6 — Istruzioni per gli screenshot in-app

```
Lavoro su TeamPreview, un team builder VGC per Pokémon Champions. La sezione
.screenshot-panel in index.html (dentro .roster) permette di caricare due
screenshot ("Info Pokémon" e "Statistiche", input #screenshot-1 e #screenshot-2)
per comporre automaticamente un team via OCR + riconoscimento AI (vedi
orchestrator.js/ai-vision.js — non serve toccare questi file). Oggi la sezione non
spiega da dove recuperare questi due screenshot nel gioco.

TASK: aggiungi, vicino a questa sezione (es. un blocco di testo pieghevole/
accordion o un paragrafo sotto la label esistente, per non appesantire la UI a chi
non ne ha bisogno), le istruzioni passo-passo per ottenere i due screenshot giusti
dal gioco Pokémon Champions:

Se il team NON è mai stato condiviso prima:
1. Vai su Allenamento
2. Squadre calibrate
3. Condivisione squadre lotta
4. Clicca "Condividi nuova"
5. Scegli squadra lotta
6. Seleziona
7. Il gioco mostra il team: fai due screenshot, uno della schermata "Info Pokémon"
   e uno della schermata "Statistiche"

Se il team era già stato condiviso in precedenza:
1. Clicca il team
2. Info squadra lotta
3. Fai due screenshot, uno della schermata "Info Pokémon" e uno della schermata
   "Statistiche"

Scrivi questo in un testo chiaro, ben formattato, in italiano, con tono coerente
al resto del sito (guarda le label/testi già presenti in index.html per lo
stile — es. hero-sub, search-label). Deve restare compatto/non invadente vicino a
un form che l'utente userà solo ogni tanto (valuta un elemento <details>/<summary>
HTML nativo se ti sembra la soluzione più semplice e accessibile).

File coinvolti: index.html, style.css (se serve stile per il blocco istruzioni).
```

---

## Sessione 7 — Bug animazione Scout (glitch veloce + frame di un'altra espressione visibile)

```
Lavoro su TeamPreview. L'assistente "Scout" (scout.js + scout.css) usa una
sprite-sheet a griglia (img/scout-sprite.png, 12 espressioni: 4 colonne x 3 righe,
vedi SCOUT_EXPRESSIONS in scout.js). Le dimensioni di un singolo frame sono
hardcoded in due punti che DEVONO combaciare esattamente: SCOUT_FRAME_W/
SCOUT_FRAME_H in scout.js e width/height/background-size di .scout-sprite in
scout.css (valori attuali: 165x220px, background-size 660x660px — sono appena
stati cambiati da 132x176/528x528, quindi il disallineamento potrebbe essere nato
lì). La funzione say() in scout.js fa un effetto typewriter sul testo e, quando
l'emozione passata è "speaking", anima la bocca alternando i frame "speaking"/
"idle" ogni 2 caratteri scritti (variabile SCOUT_TYPE_SPEED = 30ms/carattere, quindi
il cambio frame avviene ogni ~60ms).

BUG 1 — Animazione troppo nervosa: mentre il testo scorre, la sprite "si muove
velocissima, come se glitchasse". Il cambio frame ogni 2 caratteri (~60ms) è
probabilmente troppo frequente per sembrare un parlato naturale. Rallenta o
disaccoppia l'animazione della bocca dal ritmo dei singoli caratteri — es. cambia
frame ogni 4-5 caratteri, oppure usa un intervallo temporale fisso e indipendente
(es. ogni 150-200ms) invece che legato al conteggio caratteri del typewriter.
Prova valori diversi e scegli quello più naturale.

BUG 2 — Si vede un pezzo di un'altra espressione (es. "la spalla" di un frame
adiacente nella griglia): sintomo classico di frame bleeding, probabile
disallineamento tra le dimensioni REALI dei singoli frame nel file
img/scout-sprite.png e i valori hardcoded (SCOUT_FRAME_W/H, background-size) usati
per calcolare background-position in setFrame(). Verifica le dimensioni reali del
file immagine (es. con un tool immagini/ispezione, il commento in scout.css dice
che il sorgente dovrebbe essere quadrato 1024x1024, griglia 4x3) e ricalcola i
valori esatti; se il problema persiste per via di arrotondamenti, valuta un piccolo
inset/crop di sicurezza su ogni frame (qualche pixel in meno ai bordi) per evitare
che il bordo di un frame adiacente resti visibile.

File coinvolti: scout.js, scout.css, ispezione (non rigenerazione) di
img/scout-sprite.png.
```

---

## Idea da definire (non ancora un prompt eseguibile)

**"Passa il team a un'AI esterna più potente"**: dato che l'AI del sito potrebbe
non bastare per consigli avanzati, l'idea è che Scout generi un prompt pronto
(con il team condiviso dentro) da incollare in un'AI esterna (Claude, Gemini, ecc.)
con più potenza di calcolo. Prima di trasformarla in un prompt per una sessione
Claude Code, va decisa:
- cosa contiene esattamente il prompt generato (solo il roster in JSON? già con le
  debolezze/hint meta calcolati, come per handleCoachAnalysis?);
- da dove si attiva (una voce del menu di Scout della Sessione 1/2, o un bottone a
  parte);
- se va copiato automaticamente negli appunti (Clipboard API) o solo mostrato in
  un box selezionabile;
- se l'output generato deve restare in italiano o proporre anche l'inglese (le AI
  esterne potrebbero rispondere meglio in inglese su questi dati).

Quando hai le risposte a questi punti, questa idea può diventare una sessione come
le altre.
