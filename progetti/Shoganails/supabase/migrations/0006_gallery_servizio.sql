-- Permette di taggare ogni foto della galleria con il servizio a cui si
-- riferisce (semipermanente, ricostruzione, piedi...), per poterle filtrare
-- in home page. Campo libero e opzionale: l'admin può lasciarlo vuoto.
alter table public.gallery_photos add column if not exists servizio text;
