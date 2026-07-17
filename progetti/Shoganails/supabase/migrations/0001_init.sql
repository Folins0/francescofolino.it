-- Shoganails — schema iniziale (Prompt 2)
-- services, weeks, shift_uploads, available_slots, booking_requests + RLS.

-- ============================================================
-- 1. services
-- ============================================================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  prezzo_chf numeric(6, 2) not null,
  ordine_visualizzazione integer not null default 0
);

insert into public.services (nome, prezzo_chf, ordine_visualizzazione)
select v.nome, v.prezzo_chf, v.ordine
from (
  values
    ('Mani', 40.00, 1),
    ('Piedi', 30.00, 2),
    ('Mani+Piedi', 70.00, 3)
) as v(nome, prezzo_chf, ordine)
where not exists (select 1 from public.services);

-- ============================================================
-- 2. weeks
-- ============================================================
create table if not exists public.weeks (
  id uuid primary key default gen_random_uuid(),
  data_inizio date not null,
  data_fine date not null,
  stato text not null default 'bozza'
    check (stato in ('bozza', 'pubblicata', 'chiusa')),
  creato_il timestamptz not null default now(),
  unique (data_inizio, data_fine)
);

-- ============================================================
-- 3. shift_uploads
-- ============================================================
create table if not exists public.shift_uploads (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks (id) on delete cascade,
  url_immagine text not null,
  dati_estratti_grezzi jsonb,
  confermato boolean not null default false,
  creato_il timestamptz not null default now()
);

create index if not exists shift_uploads_week_id_idx
  on public.shift_uploads (week_id);

-- ============================================================
-- 4. available_slots
-- ============================================================
create table if not exists public.available_slots (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks (id) on delete cascade,
  giorno date not null,
  ora_inizio time not null,
  ora_fine time not null,
  stato text not null default 'libero'
    check (stato in ('libero', 'richiesto', 'confermato')),
  constraint available_slots_orari_validi check (ora_fine > ora_inizio)
);

create index if not exists available_slots_week_id_idx
  on public.available_slots (week_id);
create index if not exists available_slots_giorno_idx
  on public.available_slots (giorno);

-- ============================================================
-- 5. booking_requests
-- ============================================================
create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.available_slots (id) on delete cascade,
  nome_cliente text not null,
  telefono_cliente text not null,
  service_id uuid not null references public.services (id),
  orario_preferito time,
  note text,
  stato text not null default 'in_attesa'
    check (stato in ('in_attesa', 'confermato', 'rifiutato')),
  creato_il timestamptz not null default now()
);

create index if not exists booking_requests_slot_id_idx
  on public.booking_requests (slot_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.services enable row level security;
alter table public.weeks enable row level security;
alter table public.shift_uploads enable row level security;
alter table public.available_slots enable row level security;
alter table public.booking_requests enable row level security;

-- services: lettura pubblica, scrittura solo da dashboard/service role.
create policy "services_select_public"
  on public.services for select
  to anon, authenticated
  using (true);

-- weeks: lettura pubblica (serve a /prenota per trovare la settimana
-- pubblicata), scrittura solo da utente autenticato (admin).
create policy "weeks_select_public"
  on public.weeks for select
  to anon, authenticated
  using (true);

create policy "weeks_write_authenticated"
  on public.weeks for all
  to authenticated
  using (true)
  with check (true);

-- shift_uploads: dati interni (foto + output IA grezzo) -> solo admin.
create policy "shift_uploads_all_authenticated"
  on public.shift_uploads for all
  to authenticated
  using (true)
  with check (true);

-- available_slots: lettura pubblica in sola lettura, scrittura solo admin.
-- (Prompt 5/6 introdurranno un update mirato per lo stato slot lato
-- cliente tramite una funzione/API dedicata, non direttamente via RLS anon.)
create policy "available_slots_select_public"
  on public.available_slots for select
  to anon, authenticated
  using (true);

create policy "available_slots_write_authenticated"
  on public.available_slots for all
  to authenticated
  using (true)
  with check (true);

-- booking_requests: chiunque può inserire una richiesta, solo admin legge
-- (e aggiorna lo stato in_attesa -> confermato/rifiutato).
create policy "booking_requests_insert_public"
  on public.booking_requests for insert
  to anon, authenticated
  with check (true);

create policy "booking_requests_select_authenticated"
  on public.booking_requests for select
  to authenticated
  using (true);

create policy "booking_requests_update_authenticated"
  on public.booking_requests for update
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Storage: bucket per le foto dei fogli turni (solo admin)
-- ============================================================
insert into storage.buckets (id, name, public)
select 'foglio-turni', 'foglio-turni', false
where not exists (
  select 1 from storage.buckets where id = 'foglio-turni'
);

create policy "foglio_turni_authenticated_all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'foglio-turni')
  with check (bucket_id = 'foglio-turni');
