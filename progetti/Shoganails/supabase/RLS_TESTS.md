# Verifica delle RLS policy

Dopo aver applicato tutte le migration (`0001_init.sql`, `0002_booking_and_notifications.sql`,
`0003_hardening.sql`) sul progetto Supabase, verifica che un utente **non autenticato**
non possa leggere `booking_requests` o `shift_uploads`. Sostituisci `<PROJECT_URL>` e
`<ANON_KEY>` con i tuoi valori (Project Settings → API).

## 1. booking_requests non deve essere leggibile da anon

```bash
curl -s "<PROJECT_URL>/rest/v1/booking_requests?select=*" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"
```

Risultato atteso: `[]` (array vuoto), anche se nel database ci sono righe. Non esiste
nessuna policy `select` per il ruolo `anon` su questa tabella (solo
`booking_requests_select_authenticated`).

## 2. shift_uploads non deve essere leggibile da anon

```bash
curl -s "<PROJECT_URL>/rest/v1/shift_uploads?select=*" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"
```

Risultato atteso: `[]`.

## 3. Un anon non deve poter inserire direttamente in booking_requests

```bash
curl -s -X POST "<PROJECT_URL>/rest/v1/booking_requests" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"slot_id":"00000000-0000-0000-0000-000000000000","nome_cliente":"Test","telefono_cliente":"0791234567","service_id":"00000000-0000-0000-0000-000000000000"}'
```

Risultato atteso (dopo `0003_hardening.sql`): errore 401/403 — nessuna policy `insert`
diretta per `anon`. L'unico modo per creare una richiesta è la funzione
`request_booking()` (vedi punto 5), che valida lo slot prima di scrivere.

## 4. services e available_slots devono restare leggibili pubblicamente

```bash
curl -s "<PROJECT_URL>/rest/v1/services?select=*" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"

curl -s "<PROJECT_URL>/rest/v1/available_slots?select=*" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```

Risultato atteso: le righe esistenti (non un array vuoto) — servono a `/prenota` per
mostrare gli orari liberi senza login.

## 5. Il flusso corretto di prenotazione (via funzione RPC)

```bash
curl -s -X POST "<PROJECT_URL>/rest/v1/rpc/request_booking" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "p_slot_id": "<UUID_DI_UNO_SLOT_LIBERO>",
    "p_nome_cliente": "Test",
    "p_telefono_cliente": "0791234567",
    "p_service_id": "<UUID_SERVIZIO>",
    "p_orario_preferito": "10:00",
    "p_note": null
  }'
```

Risultato atteso: la richiesta viene creata con successo (200) e lo slot passa a
`stato = 'richiesto'`. Richiamando la stessa RPC sullo stesso slot una seconda volta,
deve fallire con l'errore `"Questo orario non è più disponibile, scegline un altro"`.

## 6. push_subscriptions non deve essere leggibile/scrivibile da anon

```bash
curl -s "<PROJECT_URL>/rest/v1/push_subscriptions?select=*" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```

Risultato atteso: `[]`.

## 7. Storage: il bucket foglio-turni non deve essere accessibile da anon

```bash
curl -s "<PROJECT_URL>/storage/v1/object/list/foglio-turni" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  -X POST -H "Content-Type: application/json" -d '{"prefix":""}'
```

Risultato atteso: errore 400/403 (bucket privato, nessuna policy per `anon`).

---

Se un test non dà il risultato atteso, controlla in Supabase → Authentication →
Policies che le migration siano state effettivamente eseguite (in ordine) e che non ci
siano policy aggiuntive create manualmente dal dashboard che sovrascrivono queste.
