# Prompt per Claude Code — Sito + App Shoganails

Da usare in sequenza, un prompt per sessione (o per fase). Ogni prompt presuppone che Claude Code abbia accesso al repository e veda il lavoro fatto nei passi precedenti.

---

## Contesto generale (incolla questo all'inizio della PRIMA sessione, poi non serve ripeterlo — Claude Code lo terrà a mente leggendo il codice)

```
Sto costruendo un sito + mini-app di prenotazione per il negozio di unghie di mia madre
(nome: Shoganails, Instagram: @_shoganai_2022). Lavora come hobby part-time e ha anche un
altro lavoro a turni, quindi può fare le unghie solo negli orari liberi da quel turno.

Requisiti chiave:
- Le clienti NON prenotano in automatico: mandano una RICHIESTA per uno slot libero
  (nome, telefono, servizio scelto, orario preferito). Mia madre riceve una notifica
  nel pannello admin e poi conferma manualmente la cliente via WhatsApp. Solo dopo la
  conferma lo slot risulta "occupato".
- Si può prenotare solo per LA SETTIMANA CORRENTE (mai settimane future), perché i turni
  del suo altro lavoro le vengono comunicati ogni giovedì.
- Ogni giovedì mia madre carica nel pannello admin una FOTO del foglio turni del suo altro
  lavoro. Un modello IA con visione legge il foglio, isola le righe con il suo nome
  ("Grazia"), individua i giorni in cui NON compare (= giorni completamente liberi) e
  propone gli orari liberi per le unghie. Le righe che finiscono con "a chiusura" non hanno
  un orario fisso: il sistema deve chiedere a lei l'orario di chiusura per quel giorno.
  Prima di pubblicare gli slot, le mostra un riepilogo modificabile e lei conferma o
  corregge (l'OCR/lettura IA può sbagliare, serve sempre un controllo umano finale).
  Se nel foglio compaiono note o asterischi vicino al suo nome, l'app li segnala invece
  di ignorarli in automatico.
- Servizi e prezzi (Franchi Svizzeri): Mani 40 CHF, Piedi 30 CHF, Mani+Piedi 70 CHF.
  Le durate non sono fisse: chi prenota sceglie solo il servizio e un orario indicativo,
  la durata la gestisce lei manualmente in fase di conferma.
- NON deve comparire l'indirizzo del negozio sul sito pubblico: le clienti lo ricevono
  privatamente via WhatsApp dopo la conferma.
- Notifiche verso mia madre: dentro l'app/pannello (push via browser/PWA), niente SMS o
  servizi a pagamento. Lei poi contatta le clienti su WhatsApp.
- Budget vicino allo zero: hosting gratuito (Vercel), database gratuito (Supabase free
  tier). L'unico costo accettabile è un eventuale dominio personalizzato (~10-15€/anno).
- Stile grafico ispirato al suo Instagram: palette calda arancione-corallo-rosa per
  accenti/bottoni, sfondo chiaro con richiami al marmo bianco/grigio, font elegante per
  logo e titoli, foto delle unghie (nude/pastello con dettagli colorati) come elemento
  centrale della home.

Stack scelto: Next.js (React) + Supabase (Postgres, Auth, Realtime) + Vercel per il
deploy. Mobile-first: sia le clienti che mia madre useranno soprattutto il telefono.
```

---

## Prompt 1 — Setup del progetto

```
Crea un nuovo progetto Next.js (App Router, TypeScript, Tailwind CSS) per il sito
Shoganails. Configuralo per il deploy su Vercel. Aggiungi il client Supabase
(@supabase/supabase-js) con le variabili d'ambiente in .env.local.example (senza chiavi
reali). Struttura le cartelle in modo chiaro:
- app/ (home page pubblica, pagina prenotazioni, pannello admin sotto /admin)
- components/
- lib/ (client supabase, utility per date/orari)
- types/ (tipi TypeScript condivisi)

Aggiungi un README.md con le istruzioni per: creare un progetto Supabase gratuito,
copiare le chiavi in .env.local, avviare in locale (npm run dev), fare il deploy su
Vercel collegando il repo GitHub.

Non implementare ancora logica di business: solo scaffolding pulito, una home page
placeholder, e conferma che il progetto builda senza errori.
```

---

## Prompt 2 — Schema del database

```
Progetta lo schema Supabase (Postgres) per queste entità, e scrivi le migration SQL
(cartella supabase/migrations):

1. services: id, nome (Mani / Piedi / Mani+Piedi), prezzo_chf, ordine_visualizzazione.
   Precarica i 3 servizi con i prezzi: Mani 40, Piedi 30, Mani+Piedi 70.

2. weeks: rappresenta la settimana attualmente "aperta" per le prenotazioni.
   Campi: id, data_inizio, data_fine, stato (bozza / pubblicata / chiusa),
   creato_il.

3. shift_uploads: una foto del foglio turni caricata per una data week.
   Campi: id, week_id, url_immagine, dati_estratti_grezzi (jsonb, output IA),
   confermato (bool), creato_il.

4. available_slots: le fasce libere per la settimana corrente, generate dopo la
   conferma dei turni. Campi: id, week_id, giorno (date), ora_inizio, ora_fine,
   stato (libero / richiesto / confermato).

5. booking_requests: le richieste delle clienti.
   Campi: id, slot_id, nome_cliente, telefono_cliente, service_id,
   orario_preferito, note, stato (in_attesa / confermato / rifiutato),
   creato_il.

Aggiungi Row Level Security: le tabelle admin (shift_uploads, dettagli interni)
leggibili solo da utente autenticato; available_slots e services leggibili
pubblicamente in sola lettura; booking_requests scrivibili da chiunque (insert)
ma leggibili solo da admin.

Scrivi anche i tipi TypeScript generati/corrispondenti in types/database.ts.
```

---

## Prompt 3 — Pannello admin: login e caricamento foglio turni

```
Implementa /admin con autenticazione Supabase (email+password, un solo utente:
mia madre). Dopo il login, crea la sezione "Nuova settimana":

1. Upload di una foto (input file o scatto da mobile) del foglio turni.
2. Invia l'immagine a un modello IA con visione (usa l'SDK Anthropic, modello
   Claude, con la chiave in ANTHROPIC_API_KEY) con un prompt che gli chiede di:
   - estrarre, per ogni giorno della settimana indicato nel foglio, le righe
     con orario di inizio/fine e nome persona
   - isolare solo le righe dove il nome corrisponde a "Grazia" (gestendo
     possibili errori di battitura/OCR simili)
   - segnalare i giorni dove "Grazia" non compare affatto (giorno libero)
   - segnalare eventuali asterischi o note vicino al suo nome, senza
     interpretarle
   - restituire un JSON strutturato: { giorni: [{ data, turni: [{inizio, fine,
     nota_chiusura: bool}], libero_tutto_il_giorno: bool, note_flag: string[] }] }
3. Per ogni turno con nota_chiusura=true, mostra un campo per far inserire
   manualmente l'orario di chiusura di quel giorno.
4. Mostra un riepilogo editabile riga per riga (lei deve poter correggere
   orari letti male) con gli orari LIBERI proposti (giornata meno turno).
5. Un bottone "Conferma e pubblica": salva gli available_slots per la week e
   la marca come "pubblicata".

Gestisci lo stato di caricamento e possibili errori dell'IA (es. immagine
poco chiara) con un messaggio chiaro e la possibilità di ricaricare la foto o
correggere tutto a mano.
```

---

## Prompt 4 — Sito pubblico: home page

```
Costruisci la home page pubblica (mobile-first). Contenuti:
- Header con logo/nome "Shoganails" (font elegante), palette calda
  arancione-corallo-rosa, sfondo chiaro con richiami al marmo.
- Galleria foto (uso placeholder per ora, poi sostituiremo con le foto reali
  che mia madre fornirà) delle unghie fatte.
- Sezione servizi e prezzi: Mani 40 CHF, Piedi 30 CHF, Mani+Piedi 70 CHF.
- Link al profilo Instagram @_shoganai_2022.
- Bottone ben visibile "Prenota un appuntamento" che porta a /prenota.
- NESSUN indirizzo fisico o mappa: solo un testo tipo "L'indirizzo esatto ti
  verrà comunicato su WhatsApp dopo la conferma dell'appuntamento".

Rendi il design pulito, non affollato, ottimizzato per essere aperto da
telefono (la maggior parte delle clienti userà lo smartphone).
```

---

## Prompt 5 — Pagina prenotazioni (lato cliente)

```
Costruisci /prenota. Deve:
1. Leggere la week "pubblicata" corrente da Supabase e mostrare solo gli
   available_slots con stato "libero", raggruppati per giorno.
2. Se non c'è nessuna settimana pubblicata (es. giovedì mattina prima che
   mia madre carichi i turni), mostrare un messaggio tipo "Gli orari di
   questa settimana non sono ancora disponibili, ricontrolla più tardi".
3. La cliente sceglie: un giorno/fascia libera, un servizio (Mani / Piedi /
   Mani+Piedi con prezzo), inserisce nome e numero di telefono, ed
   eventuali note.
4. Al submit, crea una booking_request con stato "in_attesa" e marca lo slot
   come "richiesto" (temporaneamente, così due clienti non richiedono lo
   stesso slot in contemporanea senza saperlo).
5. Mostra una conferma chiara: "Richiesta inviata! Ti contatteremo su
   WhatsApp per confermare l'appuntamento".

Validazione base sui campi (telefono in formato plausibile, nome non vuoto).
Nessun pagamento online: è solo una richiesta.
```

---

## Prompt 6 — Notifiche in tempo reale per l'admin

```
Nel pannello /admin, aggiungi una sezione "Richieste" che mostra in tempo
reale (Supabase Realtime, subscription sulla tabella booking_requests) le
nuove richieste con stato "in_attesa", con nome cliente, telefono, servizio
e orario richiesto.

Aggiungi una notifica push del browser (Web Push API + service worker) che
avvisi mia madre appena arriva una nuova richiesta, anche se non ha il
pannello aperto in primo piano (ma con l'app aggiunta alla home del telefono
come PWA). Spiega nel README come "installare" il sito come app sul suo
telefono (Aggiungi a schermata Home) per ricevere le notifiche.

Per ogni richiesta, aggiungi due bottoni: "Confermato" (marca booking come
confermato e lo slot come confermato) e "Rifiutato" (libera di nuovo lo
slot). Nessun invio automatico di messaggi: la conferma vera avviene su
WhatsApp, questi bottoni servono solo ad aggiornare lo stato nell'app.
```

---

## Prompt 7 — Rifinitura e deploy

```
Rivedi l'intera app per:
- Responsive design corretto su mobile (priorità) e desktop.
- Gestione errori e stati di caricamento in tutte le pagine.
- Accessibilità di base (contrasto colori, label sui form).
- Verifica che le RLS policy Supabase impediscano a un utente non
  autenticato di leggere booking_requests o shift_uploads.

Prepara il deploy su Vercel: variabili d'ambiente necessarie, istruzioni
per collegare un dominio personalizzato (opzionale), e un checklist finale
in README.md di cosa serve fare manualmente (creare progetto Supabase,
creare l'utente admin, ottenere una chiave Anthropic API, configurare le
env var su Vercel).
```

---

### Note d'uso

Segui i prompt in ordine: ognuno costruisce sul precedente. Dopo ogni fase, prova
l'app in locale (o su una preview Vercel) prima di passare al prompt successivo,
così eventuali errori si scoprono e correggono a step piccoli invece che tutti
insieme alla fine.
