# Shoganails

Progetto Next.js (App Router, TypeScript, Tailwind CSS) per il sito + mini-app
di prenotazione di Shoganails. Contiene la home page pubblica, la pagina di
prenotazione (`/prenota`), il pannello admin (`/admin`) con caricamento del
foglio turni tramite IA con visione, richieste in tempo reale e notifiche
push per Grazia.

## Setup

### 1. Progetto Supabase

1. Crea un progetto gratuito su [supabase.com](https://supabase.com).
2. In **SQL Editor**, esegui in ordine:
   - `supabase/migrations/0001_init.sql` — crea le tabelle `services`, `weeks`,
     `shift_uploads`, `available_slots`, `booking_requests`, le policy RLS e il
     bucket storage privato `foglio-turni` per le foto dei fogli turni;
   - `supabase/migrations/0002_booking_and_notifications.sql` — aggiunge la
     funzione `request_booking()` (usata da `/prenota` per creare una
     richiesta in modo sicuro e atomico), la tabella `push_subscriptions` e
     abilita Supabase Realtime sulla tabella `booking_requests`;
   - `supabase/migrations/0003_hardening.sql` — rimuove una policy RLS
     ridondante su `booking_requests` che permetteva un insert diretto da
     utenti non autenticati fuori dal flusso di `request_booking()` (vedi
     `supabase/RLS_TESTS.md` per come verificarlo);
   - `supabase/migrations/0004_gallery.sql` — tabella `gallery_photos` e
     bucket storage pubblico `galleria`, per le foto gestibili dal pannello
     admin e mostrate sulla home page.
3. In **Authentication > Users**, crea manualmente **un solo utente admin**
   (email + password) per tua madre. Non c'è una pagina di registrazione: il
   login accetta solo utenti già esistenti.
4. In **Project Settings > API**, copia `Project URL`, `anon public key` e
   `service_role key` (quest'ultima serve solo lato server per le notifiche
   push, vedi sotto).

### 2. Chiave Groq (lettura IA del foglio turni)

Crea una chiave API gratuita su [console.groq.com/keys](https://console.groq.com/keys).

### 3. Chiavi VAPID (notifiche push)

```bash
npm install
npm run generate-vapid-keys
```

Copia la Public Key e la Private Key stampate nel terminale nelle rispettive
variabili d'ambiente (sotto).

### 4. Variabili d'ambiente

```bash
cp .env.local.example .env.local
```

Compila `.env.local` con le chiavi Supabase, Groq e VAPID ottenute sopra.

### 5. Avvio in locale

```bash
npm install
npm run dev
```

Apri http://localhost:3000 per il sito pubblico, http://localhost:3000/admin
per il pannello (richiede login).

> Le notifiche push richiedono HTTPS: in locale funzionano su `localhost`
> (eccezione del browser), ma per testarle su un telefono reale serve il
> deploy su Vercel (HTTPS automatico) o un tunnel HTTPS (es. `ngrok`).

## Come Grazia installa l'app sul telefono (per ricevere le notifiche)

Le notifiche push del browser funzionano **anche ad app chiusa** solo se il
sito è stato aggiunto alla schermata Home come PWA (Progressive Web App).

### Su iPhone (Safari)

1. Apri il pannello admin con **Safari** (su iPhone solo Safari supporta le
   notifiche push per le PWA).
2. Tocca l'icona di condivisione (il quadrato con la freccia verso l'alto).
3. Scorri e tocca **"Aggiungi a Home"**, poi **"Aggiungi"**.
4. Apri l'app dall'icona appena creata sulla schermata Home (non da Safari).
5. Fai login, e nella sezione **Richieste** tocca **"Attiva notifiche"**.
   Conferma il permesso quando richiesto.

### Su Android (Chrome)

1. Apri il pannello admin con **Chrome**.
2. Tocca i tre puntini in alto a destra → **"Aggiungi a schermata Home"** (o
   **"Installa app"**) → conferma.
3. Apri l'app dall'icona sulla schermata Home, fai login e tocca **"Attiva
   notifiche"** nella sezione Richieste.

Da quel momento, ogni nuova richiesta di prenotazione fa arrivare una
notifica sul telefono anche ad app chiusa, finché il telefono è acceso e
connesso. Se le notifiche smettono di funzionare (es. cambio telefono), basta
rientrare nell'app e toccare di nuovo "Attiva notifiche".

## Cosa contiene

- `app/page.tsx` — home page pubblica.
- `app/prenota/page.tsx` + `components/BookingForm.tsx` — pagina di
  prenotazione: mostra gli orari liberi della settimana pubblicata
  (raggruppati per giorno), la cliente sceglie orario e servizio, inserisce
  nome/telefono/note e invia. Se nessuna settimana è ancora pubblicata,
  mostra un messaggio invece del form.
- `app/api/prenota/route.ts` — riceve la richiesta di prenotazione, chiama la
  funzione Postgres `request_booking()` (atomica: evita che due clienti
  prendano lo stesso slot) e, se creata con successo, invia una notifica push
  a Grazia.
- `app/admin/login/page.tsx` — login email+password (Supabase Auth).
- `app/admin/page.tsx` — pannello admin con tre sezioni:
  - **Richieste** (`components/admin/Richieste.tsx`): mostra in tempo reale
    (Supabase Realtime) le nuove richieste con stato `in_attesa` — nome,
    telefono, servizio, orario. Bottone **"Attiva notifiche"** per registrare
    il dispositivo alle notifiche push. Per ogni richiesta, due bottoni:
    **"Confermato"** (marca booking e slot come confermati) e
    **"Rifiutato"** (libera di nuovo lo slot). Nessun messaggio viene inviato
    automaticamente: la conferma vera con la cliente resta su WhatsApp.
  - **Nuova settimana** (`components/admin/NuovaSettimana.tsx`):
    1. carica una foto del foglio turni (scatto da mobile o file);
    2. la foto viene inviata a un modello con visione (Groq, Llama 4) che
       isola le righe di "Grazia" (tollerando piccoli errori di
       lettura/battitura), segnala i giorni completamente liberi e le
       eventuali note/asterischi vicino al nome, senza interpretarli;
    3. per ogni turno "a chiusura" viene richiesto un orario di chiusura
       inserito a mano;
    4. un riepilogo editabile per ogni giorno mostra i turni letti e gli
       orari liberi proposti (giornata meno turni), tutti correggibili a
       mano;
    5. il bottone **"Conferma e pubblica"** salva gli `available_slots` per
       la settimana corrente e la marca come `pubblicata`.
    Se l'IA non riesce a leggere la foto, viene mostrato un messaggio chiaro
    con la possibilità di ricaricare la foto o passare all'inserimento
    manuale di tutta la settimana.
  - **Foto del sito** (`components/admin/Galleria.tsx`): aggiungi o elimina
    le foto mostrate nella sezione "Le nostre unghie" della home page
    (`app/api/admin/gallery/route.ts`, tabella `gallery_photos` + bucket
    pubblico `galleria`). Finché non c'è nessuna foto, la home mostra dei
    segnaposto.
- `middleware.ts` — protegge tutte le rotte `/admin/*`: senza sessione
  valida reindirizza a `/admin/login`.
- `lib/supabase/client.ts` / `lib/supabase/server.ts` — client Supabase per
  browser e per Server Component/Route Handler (via `@supabase/ssr`).
- `lib/supabase/admin.ts` — client con la `service_role` key (solo
  server-side), usato per leggere `push_subscriptions` e inviare le notifiche
  anche quando è una cliente anonima a innescare l'evento.
- `lib/push.ts` — invio delle notifiche Web Push (libreria `web-push`) a
  tutte le subscription salvate; rimuove automaticamente quelle scadute.
- `lib/push-client.ts` — helper lato browser: registra il service worker,
  chiede il permesso e salva la subscription.
- `public/sw.js` — service worker: mostra la notifica anche ad app chiusa e
  apre `/admin` al tap.
- `public/manifest.json` — manifest PWA (necessario per "Aggiungi a Home").
- `lib/ai.ts` — chiamata a Groq (visione) con il prompt di lettura del foglio
  turni e parsing/validazione della risposta JSON.
- `lib/shifts.ts` — calcolo delle fasce libere (giornata meno turni) e
  tolleranza a varianti/errori di battitura del nome "Grazia".
- `lib/week.ts` — utility per la settimana corrente (lunedì-domenica).
- `supabase/migrations/0001_init.sql` — schema DB iniziale + RLS.
- `supabase/migrations/0002_booking_and_notifications.sql` — funzione
  `request_booking()`, tabella `push_subscriptions`, Realtime su
  `booking_requests`.
- `supabase/migrations/0003_hardening.sql` — chiude un varco RLS residuo su
  `booking_requests` (vedi "Note sulla sicurezza dei dati" sotto).
- `supabase/RLS_TESTS.md` — comandi `curl` per verificare a mano che le RLS
  blocchino davvero le letture non autorizzate.
- `types/database.ts`, `types/shifts.ts` — tipi TypeScript condivisi.

## Note sulla sicurezza dei dati

- Solo utenti autenticati (l'unico account admin) possono leggere/scrivere
  `weeks`, `shift_uploads`, `available_slots`, `push_subscriptions`;
  `booking_requests` è leggibile solo da admin.
- Le clienti (utenti anonimi) non hanno mai accesso diretto in scrittura ad
  `available_slots`: la creazione di una richiesta passa dalla funzione
  Postgres `request_booking()` (security definer), che aggiorna lo slot e
  crea la richiesta in modo atomico (row lock), evitando che due clienti
  prendano lo stesso orario in contemporanea.
- Le foto dei fogli turni vengono salvate in uno storage bucket **privato**
  (`foglio-turni`), non pubblicamente accessibile.
- L'indirizzo del negozio non compare mai nel codice/sito pubblico.

## Deploy su Vercel

1. Metti il codice su GitHub (repo privato va bene) e collega il repo su
   [vercel.com](https://vercel.com) → **Add New → Project**. Framework
   rilevato automaticamente come Next.js, non serve cambiare le impostazioni
   di build.
2. Aggiungi le variabili d'ambiente in **Project Settings → Environment
   Variables** (per Production, Preview e Development):

   | Variabile | Dove trovarla |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (segreta) |
   | `GROQ_API_KEY` | console.groq.com → API Keys |
   | `GROQ_VISION_MODEL` (opzionale) | default `meta-llama/llama-4-scout-17b-16e-instruct` se non impostata |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `npm run generate-vapid-keys` |
   | `VAPID_PRIVATE_KEY` | `npm run generate-vapid-keys` (segreta) |
   | `VAPID_SUBJECT` | `mailto:tuo-indirizzo@example.com` |

3. **Deploy**. Il deploy riparte automaticamente ad ogni push sul branch
   collegato. Vercel fornisce HTTPS automatico, necessario per le notifiche
   push.
4. Fai login su `/admin` sull'URL `*.vercel.app` che Vercel ti assegna e
   verifica che login, caricamento foto turni e prenotazione di prova
   funzionino prima di condividere il link con le clienti.

### Dominio personalizzato (opzionale, ~10-15 CHF/anno)

1. Registra un dominio presso un provider qualsiasi (es. Infomaniak,
   Namecheap, Cloudflare).
2. Su Vercel: progetto → **Settings → Domains** → aggiungi il dominio.
3. Vercel mostra i record DNS da impostare (di solito un record `A` verso il
   dominio radice e/o un `CNAME` per `www`): copiali nel pannello DNS del tuo
   provider.
4. Attendi la propagazione DNS (di solito pochi minuti, a volte fino a
   24-48h) — Vercel emette automaticamente il certificato HTTPS non appena i
   record sono corretti.
5. Se non vuoi un dominio personalizzato, l'URL gratuito `*.vercel.app`
   funziona perfettamente, incluse le notifiche push (richiedono solo HTTPS,
   che Vercel fornisce comunque).

## Checklist finale — cosa fare manualmente prima di andare live

- [ ] Creato un progetto Supabase gratuito e applicate **in ordine** tutte le
      migration in `supabase/migrations/` (0001 → 0002 → 0003).
- [ ] Creato manualmente **un solo utente admin** (Grazia) in Supabase →
      Authentication → Users, con email e password.
- [ ] Ottenuta una chiave Groq API (console.groq.com), gratuita, per la
      lettura delle foto dei turni.
- [ ] Generate le chiavi VAPID (`npm run generate-vapid-keys`) per le
      notifiche push.
- [ ] Configurate **tutte** le variabili d'ambiente elencate sopra su Vercel
      (Production + Preview), copiate da `.env.local.example`.
- [ ] Verificato con `supabase/RLS_TESTS.md` che `booking_requests` e
      `shift_uploads` non siano leggibili da un utente non autenticato, e che
      l'insert diretto in `booking_requests` sia bloccato (solo via
      `request_booking()`).
- [ ] Fatto un giro di prova completo in produzione: login admin, caricamento
      foto foglio turni, pubblicazione settimana, richiesta di prenotazione
      da `/prenota`, conferma/rifiuto da `/admin`.
- [ ] Installato il pannello come PWA sul telefono di Grazia (vedi sezione
      sopra) e attivate le notifiche push da `/admin`.
- [ ] (Opzionale) Registrato e collegato un dominio personalizzato.
- [ ] Sostituite le foto placeholder della galleria in home con foto reali
      delle unghie (`components/GalleryPlaceholder.tsx`) quando disponibili.
