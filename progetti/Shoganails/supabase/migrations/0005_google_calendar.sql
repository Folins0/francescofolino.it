-- Shoganails — traccia l'evento Google Calendar collegato a ogni prenotazione confermata

alter table public.booking_requests
  add column if not exists google_event_id text;
