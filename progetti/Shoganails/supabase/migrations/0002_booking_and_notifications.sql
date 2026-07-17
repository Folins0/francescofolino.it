-- Shoganails — Prompt 5/6: prenotazione atomica lato cliente + notifiche push
-- per l'admin. Aggiunta non distruttiva sopra 0001_init.sql.

-- ============================================================
-- 1. request_booking(): unico punto d'ingresso per creare una richiesta di
-- prenotazione. Gira come SECURITY DEFINER così può leggere/aggiornare
-- available_slots (che l'utente anon non può scrivere direttamente via RLS)
-- e inserire in booking_requests in modo atomico (row lock con FOR UPDATE),
-- evitando che due clienti prendano lo stesso slot in contemporanea.
-- ============================================================
create or replace function public.request_booking(
  p_slot_id uuid,
  p_nome_cliente text,
  p_telefono_cliente text,
  p_service_id uuid,
  p_orario_preferito time,
  p_note text default null
)
returns public.booking_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.available_slots%rowtype;
  v_booking public.booking_requests%rowtype;
begin
  if p_nome_cliente is null or length(trim(p_nome_cliente)) = 0 then
    raise exception 'Nome cliente obbligatorio';
  end if;
  if p_telefono_cliente is null or length(trim(p_telefono_cliente)) < 6 then
    raise exception 'Numero di telefono non valido';
  end if;

  select * into v_slot from public.available_slots where id = p_slot_id for update;

  if not found then
    raise exception 'Slot non trovato';
  end if;

  if v_slot.stato <> 'libero' then
    raise exception 'Questo orario non è più disponibile, scegline un altro';
  end if;

  update public.available_slots set stato = 'richiesto' where id = p_slot_id;

  insert into public.booking_requests (
    slot_id, nome_cliente, telefono_cliente, service_id, orario_preferito, note
  ) values (
    p_slot_id, trim(p_nome_cliente), trim(p_telefono_cliente), p_service_id, p_orario_preferito, p_note
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.request_booking(uuid, text, text, uuid, time, text)
  to anon, authenticated;

-- ============================================================
-- 2. push_subscriptions: subscription Web Push del/i browser di Grazia
-- (admin), salvate quando attiva le notifiche dal pannello. Solo admin può
-- leggerle/scriverle; vengono lette lato server con la service role key per
-- inviare le notifiche anche quando è una cliente anonima a innescare l'evento
-- (nuova richiesta da /prenota).
-- ============================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  creato_il timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_admin_only"
  on public.push_subscriptions for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- 3. Realtime: abilita gli eventi postgres_changes su booking_requests, così
-- il pannello /admin riceve le nuove richieste (stato = in_attesa) senza
-- ricaricare la pagina. Le policy RLS di booking_requests (solo authenticated
-- in select) si applicano anche ai messaggi realtime.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'booking_requests'
  ) then
    alter publication supabase_realtime add table public.booking_requests;
  end if;
end
$$;
