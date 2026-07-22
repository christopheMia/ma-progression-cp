-- Calendrier metropolitain officiel 2025-2026 et 2026-2027.
-- Source : Ministere de l'Education nationale, calendrier scolaire publie.
-- Les classes existantes appartiennent a la zone A confirmee par Christophe.

alter table classes add column if not exists zone_scolaire text not null default 'A';
do $$ begin
  alter table classes add constraint classes_zone_scolaire_check
    check (zone_scolaire in ('A', 'B', 'C'));
exception when duplicate_object then null; end $$;

with calendriers(annee, zone, numero, date_debut, date_fin) as (
  values
    (2025, 'A', 1, date '2025-09-01', date '2025-10-18'),
    (2025, 'A', 2, date '2025-11-03', date '2025-12-20'),
    (2025, 'A', 3, date '2026-01-05', date '2026-02-07'),
    (2025, 'A', 4, date '2026-02-23', date '2026-04-04'),
    (2025, 'A', 5, date '2026-04-20', date '2026-07-04'),
    (2025, 'B', 1, date '2025-09-01', date '2025-10-18'),
    (2025, 'B', 2, date '2025-11-03', date '2025-12-20'),
    (2025, 'B', 3, date '2026-01-05', date '2026-02-14'),
    (2025, 'B', 4, date '2026-03-02', date '2026-04-11'),
    (2025, 'B', 5, date '2026-04-27', date '2026-07-04'),
    (2025, 'C', 1, date '2025-09-01', date '2025-10-18'),
    (2025, 'C', 2, date '2025-11-03', date '2025-12-20'),
    (2025, 'C', 3, date '2026-01-05', date '2026-02-21'),
    (2025, 'C', 4, date '2026-03-09', date '2026-04-18'),
    (2025, 'C', 5, date '2026-05-04', date '2026-07-04'),
    (2026, 'A', 1, date '2026-09-01', date '2026-10-17'),
    (2026, 'A', 2, date '2026-11-02', date '2026-12-19'),
    (2026, 'A', 3, date '2027-01-04', date '2027-02-13'),
    (2026, 'A', 4, date '2027-03-01', date '2027-04-10'),
    (2026, 'A', 5, date '2027-04-26', date '2027-07-03'),
    (2026, 'B', 1, date '2026-09-01', date '2026-10-17'),
    (2026, 'B', 2, date '2026-11-02', date '2026-12-19'),
    (2026, 'B', 3, date '2027-01-04', date '2027-02-20'),
    (2026, 'B', 4, date '2027-03-08', date '2027-04-17'),
    (2026, 'B', 5, date '2027-05-03', date '2027-07-03'),
    (2026, 'C', 1, date '2026-09-01', date '2026-10-17'),
    (2026, 'C', 2, date '2026-11-02', date '2026-12-19'),
    (2026, 'C', 3, date '2027-01-04', date '2027-02-06'),
    (2026, 'C', 4, date '2027-02-22', date '2027-04-03'),
    (2026, 'C', 5, date '2027-04-19', date '2027-07-03')
)
insert into periodes (class_id, numero, nom, date_debut, date_fin, ordre)
select
  c.id,
  cal.numero,
  'Période ' || cal.numero,
  case when cal.numero = 1 then greatest(c.rentree_date, cal.date_debut) else cal.date_debut end,
  cal.date_fin,
  cal.numero
from classes c
join calendriers cal
  on cal.annee = extract(year from c.rentree_date)::integer
 and cal.zone = c.zone_scolaire
on conflict (class_id, numero) do update set
  nom = excluded.nom,
  date_debut = excluded.date_debut,
  date_fin = excluded.date_fin,
  ordre = excluded.ordre;

-- Rattache les semaines existantes a P1-P5 et saute les vacances completes.
with semaines_calendaires as (
  select
    c.id as class_id,
    gs::date as date_debut,
    p.numero as periode_numero,
    row_number() over (partition by c.id order by gs)::integer as numero
  from classes c
  join periodes p on p.class_id = c.id
  cross join lateral generate_series(
    date_trunc('week', c.rentree_date::timestamp),
    (select max(p2.date_fin)::timestamp from periodes p2 where p2.class_id = c.id),
    interval '7 days'
  ) gs
  where gs::date <= p.date_fin
    and (gs::date + 4) >= p.date_debut
)
update semaines s
set date_debut = sc.date_debut,
    periode_numero = sc.periode_numero
from semaines_calendaires sc
where s.class_id = sc.class_id and s.numero = sc.numero;
