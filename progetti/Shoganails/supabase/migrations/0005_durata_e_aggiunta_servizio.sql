-- Aggiunge durata e categoria ai servizi (serve per calcolare gli orari
-- disponibili in base a quanto dura il trattamento scelto) e aggiorna il
-- listino con le lavorazioni reali. Aggiunge inoltre la possibilità di
-- aggiungere un secondo servizio (piedi se si è scelto mani, o viceversa)
-- a una richiesta di prenotazione.

alter table public.services add column if not exists durata_minuti integer not null default 60;
alter table public.services add column if not exists categoria text not null default 'mani'
  check (categoria in ('mani', 'piedi'));

update public.services set durata_minuti = 60, categoria = 'mani'
  where nome = 'Semipermanente semplice';
update public.services set durata_minuti = 90, categoria = 'mani'
  where nome = 'Semipermanente rinforzato';

-- Sostituisce "Ricostruzione" generica con le due varianti reali (durata diversa)
delete from public.services where nome = 'Ricostruzione';

insert into public.services (nome, prezzo_chf, ordine_visualizzazione, descrizione, durata_minuti, categoria)
select v.nome, v.prezzo_chf, v.ordine, v.descrizione, v.durata, v.categoria
from (
  values
    ('Ricostruzione da zero', 40.00, 3, 'Ricostruzione unghie in gel, acrygel o acrilico, da zero', 120, 'mani'),
    ('Ricostruzione refill', 40.00, 4, 'Ricostruzione unghie in gel, acrygel o acrilico, refill', 90, 'mani')
) as v(nome, prezzo_chf, ordine, descrizione, durata, categoria)
where not exists (select 1 from public.services where nome = v.nome);

-- Rinomina "Piedi" nel servizio reale
delete from public.services where nome = 'Piedi';

insert into public.services (nome, prezzo_chf, ordine_visualizzazione, descrizione, durata_minuti, categoria)
select 'Pedicure estetica con semipermanente', 30.00, 5,
  'Cura e nail art per i piedi con smalto semipermanente', 60, 'piedi'
where not exists (
  select 1 from public.services where nome = 'Pedicure estetica con semipermanente'
);

-- Il pacchetto "Mani + Piedi" a prezzo fisso non ha più senso ora che le
-- lavorazioni mani hanno prezzi/durate diverse: la cliente sceglie mani e/o
-- piedi separatamente in fase di prenotazione, il totale si calcola da solo.
delete from public.services where nome in ('Mani+Piedi', 'Mani + Piedi');

-- ============================================================
-- booking_requests: possibilità di aggiungere un secondo servizio (mani+piedi
-- nella stessa richiesta) e durata/prezzo totali calcolati al momento della
-- prenotazione.
-- ============================================================
alter table public.booking_requests add column if not exists service_id_extra uuid references public.services(id);
alter table public.booking_requests add column if not exists durata_minuti integer not null default 60;
alter table public.booking_requests add column if not exists prezzo_totale_chf numeric(6, 2) not null default 0;

-- Estende request_booking() per accettare il servizio extra e la durata
-- totale, e per "ritagliare" solo l'orario richiesto dalla fascia libera
-- invece di occupare tutta la fascia: se la cliente prenota le 10:00-11:00
-- dentro una fascia libera 09:00-19:00, restano libere due nuove fasce
-- (09:00-10:00 e 11:00-19:00) così altre clienti possono prenotare lo
-- stesso giorno.
drop function if exists public.request_booking(uuid, text, text, uuid, time, text);

create or replace function public.request_booking(
  p_slot_id uuid,
  p_nome_cliente text,
  p_telefono_cliente text,
  p_service_id uuid,
  p_orario_preferito time,
  p_note text default null,
  p_service_id_extra uuid default null,
  p_durata_minuti integer default 60,
  p_prezzo_totale_chf numeric default null
)
returns public.booking_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.available_slots%rowtype;
  v_booking public.booking_requests%rowtype;
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
    service_id_extra, durata_minuti, prezzo_totale_chf
  ) values (
    p_slot_id, trim(p_nome_cliente), trim(p_telefono_cliente), p_service_id, v_inizio, p_note,
    p_service_id_extra, p_durata_minuti, coalesce(p_prezzo_totale_chf, 0)
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.request_booking(uuid, text, text, uuid, time, text, uuid, integer, numeric)
  to anon, authenticated;
