-- Permette di aggiungere una descrizione libera e opzionale a ogni foto
-- della galleria, mostrata nel dettaglio/lightbox sul sito pubblico.
alter table public.gallery_photos add column if not exists descrizione text;
