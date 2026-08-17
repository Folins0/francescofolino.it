-- Buoni regalo (valore in CHF) o legati a un servizio specifico, che Grazia
-- può emettere e le clienti inserire in fase di prenotazione. Nessun calcolo
-- automatico di sconti: il buono viene solo segnalato a Grazia, che lo
-- gestisce a mano su WhatsApp, come per il resto della prenotazione.

create table if not exists public.buoni (
  id uuid primary key default gen_random_uuid(),
  codice text not null unique,
  tipo text not null check (tipo in ('valore', 'servizio')),
  valore_chf numeric(6, 2),
  service_id uuid references public.services (id),
  beneficiario text,
  note text,
  stato text not null default 'attivo'
    check (stato in ('attivo', 'usato', 'annullato')),
  creato_il timestamptz not null default now(),
  usato_il timestamptz,
  booking_request_id uuid references public.booking_requests (id),
  constraint buoni_valore_o_servizio check (
    (tipo = 'valore' and valore_chf is not null and service_id is null)
    or
    (tipo = 'servizio' and service_id is not null and valore_chf is null)
  )
);

alter table public.buoni enable row level security;

-- Solo Grazia (authenticated) legge/scrive la tabella: niente accesso
-- diretto per le clienti, così beneficiario/note restano privati e i codici
-- non sono enumerabili via select pubblica.
create policy "buoni_all_authenticated"
  on public.buoni for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- verifica_buono(): unico modo per una cliente (anon) di controllare un
-- codice, senza avere accesso diretto alla tabella. Restituisce solo i dati
-- essenziali per mostrare un feedback nel form di prenotazione.
-- ============================================================
create or replace function public.verifica_buono(p_codice text)
returns table (
  valido boolean,
  tipo text,
  valore_chf numeric,
  servizio_nome text,
  messaggio text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buono public.buoni%rowtype;
  v_servizio_nome text;
begin
  if p_codice is null or length(trim(p_codice)) = 0 then
    return query select false, null::text, null::numeric, null::text, 'Inserisci un codice'::text;
    return;
  end if;

  select * into v_buono from public.buoni where upper(codice) = upper(trim(p_codice));

  if not found then
    return query select false, null::text, null::numeric, null::text, 'Codice non trovato'::text;
    return;
  end if;

  if v_buono.stato = 'usato' then
    return query select false, null::text, null::numeric, null::text, 'Questo buono è già stato usato'::text;
    return;
  end if;

  if v_buono.stato = 'annullato' then
    return query select false, null::text, null::numeric, null::text, 'Questo buono non è più valido'::text;
    return;
  end if;

  if v_buono.tipo = 'servizio' then
    select nome into v_servizio_nome from public.services where id = v_buono.service_id;
  end if;

  return query select true, v_buono.tipo, v_buono.valore_chf, v_servizio_nome, 'Buono valido'::text;
end;
$$;

grant execute on function public.verifica_buono(text) to anon, authenticated;

-- ============================================================
-- booking_requests: collega la richiesta al buono eventualmente usato.
-- ============================================================
alter table public.booking_requests add column if not exists buono_id uuid references public.buoni (id);

-- ============================================================
-- request_booking(): aggiunge il parametro opzionale p_buono_codice. Se
-- presente, verifica (con lock) che il buono sia attivo e lo collega alla
-- richiesta; NON lo marca come "usato" qui — resta attivo finché Grazia non
-- conferma davvero la richiesta (vedi app/api/admin/conferma-richiesta),
-- così un buono non si "brucia" per una richiesta poi rifiutata.
-- ============================================================
drop function if exists public.request_booking(uuid, text, text, uuid, time, text, uuid, integer, numeric);

create or replace function public.request_booking(
  p_slot_id uuid,
  p_nome_cliente text,
  p_telefono_cliente text,
  p_service_id uuid,
  p_orario_preferito time,
  p_note text default null,
  p_service_id_extra uuid default null,
  p_durata_minuti integer default 60,
  p_prezzo_totale_chf numeric default null,
  p_buono_codice text default null
)
returns public.booking_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.available_slots%rowtype;
  v_booking public.booking_requests%rowtype;
  v_buono public.buoni%rowtype;
  v_inizio time;
  v_fine time;
begin
  if p_nome_cliente is null or length(trim(p_nome_cliente)) = 0 then
    raise exception 'Nome cliente obbligatorio';
  end if;
  if p_telefono_cliente is null or length(trim(p_telefono_cliente)) < 6 then
    raise exception 'Numero di telefono non valido';
  end if;
  if p_orario_preferito is null or p_durata_minuti is null or p_durata_minuti <= 0 then
    raise exception 'Orario o durata non validi';
  end if;

  if p_buono_codice is not null and length(trim(p_buono_codice)) > 0 then
    select * into v_buono from public.buoni
      where upper(codice) = upper(trim(p_buono_codice)) for update;

    if not found or v_buono.stato <> 'attivo' then
      raise exception 'Il codice buono inserito non è valido o è già stato usato';
    end if;
  end if;

  select * into v_slot from public.available_slots where id = p_slot_id for update;

  if not found then
    raise exception 'Slot non trovato';
  end if;

  if v_slot.stato <> 'libero' then
    raise exception 'Questo orario non è più disponibile, scegline un altro';
  end if;

  v_inizio := p_orario_preferito;
  v_fine := p_orario_preferito + make_interval(mins => p_durata_minuti);

  if v_inizio < v_slot.ora_inizio or v_fine > v_slot.ora_fine then
    raise exception 'Questo orario non è più disponibile, scegline un altro';
  end if;

  -- fascia libera prima dell'appuntamento, se resta spazio
  if v_inizio > v_slot.ora_inizio then
    insert into public.available_slots (week_id, giorno, ora_inizio, ora_fine, stato)
    values (v_slot.week_id, v_slot.giorno, v_slot.ora_inizio, v_inizio, 'libero');
  end if;

  -- fascia libera dopo l'appuntamento, se resta spazio
  if v_fine < v_slot.ora_fine then
    insert into public.available_slots (week_id, giorno, ora_inizio, ora_fine, stato)
    values (v_slot.week_id, v_slot.giorno, v_fine, v_slot.ora_fine, 'libero');
  end if;

  -- lo slot originale diventa esattamente l'appuntamento richiesto
  update public.available_slots
    set ora_inizio = v_inizio, ora_fine = v_fine, stato = 'richiesto'
    where id = p_slot_id;

  insert into public.booking_requests (
    slot_id, nome_cliente, telefono_cliente, service_id, orario_preferito, note,
    service_id_extra, durata_minuti, prezzo_totale_chf, buono_id
  ) values (
    p_slot_id, trim(p_nome_cliente), trim(p_telefono_cliente), p_service_id, v_inizio, p_note,
    p_service_id_extra, p_durata_minuti, coalesce(p_prezzo_totale_chf, 0), v_buono.id
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.request_booking(uuid, text, text, uuid, time, text, uuid, integer, numeric, text)
  to anon, authenticated;
