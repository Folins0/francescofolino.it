-- Shoganails — galleria foto pubbliche del sito (gestibile da admin)

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  ordine integer not null default 0,
  creato_il timestamptz not null default now()
);

create index if not exists gallery_photos_ordine_idx
  on public.gallery_photos (ordine, creato_il);

alter table public.gallery_photos enable row level security;

-- lettura pubblica (la home page mostra le foto a chiunque),
-- scrittura solo da admin autenticato.
create policy "gallery_photos_select_public"
  on public.gallery_photos for select
  to anon, authenticated
  using (true);

create policy "gallery_photos_write_authenticated"
  on public.gallery_photos for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Storage: bucket pubblico per le foto della galleria del sito
-- (diverso da "foglio-turni", che resta privato).
-- ============================================================
insert into storage.buckets (id, name, public)
select 'galleria', 'galleria', true
where not exists (
  select 1 from storage.buckets where id = 'galleria'
);

-- Forza il bucket pubblico anche se esisteva già (es. creato privato in un
-- tentativo precedente): senza questo, getPublicUrl() genera link che il
-- browser non riesce a caricare.
update storage.buckets set public = true where id = 'galleria';

create policy "galleria_select_public"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'galleria');

create policy "galleria_write_authenticated"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'galleria')
  with check (bucket_id = 'galleria');
