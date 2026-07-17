-- Sostituisce il servizio generico "Mani" con le 3 lavorazioni reali che fa
-- Grazia, ciascuna con prezzo e descrizione propri. Piedi e Mani + Piedi
-- restano invariati.

alter table public.services add column if not exists descrizione text;

delete from public.services where nome = 'Mani';

insert into public.services (nome, prezzo_chf, ordine_visualizzazione, descrizione)
select v.nome, v.prezzo_chf, v.ordine, v.descrizione
from (
  values
    ('Semipermanente rinforzato', 40.00, 1, 'Smalto semipermanente con rinforzo in gel, per una tenuta più lunga'),
    ('Semipermanente semplice', 30.00, 2, 'Smalto semipermanente classico'),
    ('Ricostruzione', 40.00, 3, 'Ricostruzione unghie in gel')
) as v(nome, prezzo_chf, ordine, descrizione)
where not exists (
  select 1 from public.services where nome = v.nome
);

update public.services set descrizione = 'Cura e nail art per i piedi', ordine_visualizzazione = 4
  where nome = 'Piedi';
update public.services set descrizione = 'Il trattamento completo', ordine_visualizzazione = 5
  where nome = 'Mani+Piedi' or nome = 'Mani + Piedi';
