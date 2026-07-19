-- 010_periodes.sql
--
-- Modele "Periodes P1-P5" (fondation pour l'import par periode facon Cecile
-- et le livret LSU par periode). 100% ADDITIF : on n'ajoute que du nouveau,
-- aucune table ni colonne existante n'est modifiee ou supprimee.
--
--  - Nouvelle table `periodes` : les 5 periodes de l'annee scolaire d'une classe,
--    bornees par les vacances (calendrier officiel), avec dates EDITABLES par
--    l'enseignant (le calendrier change chaque annee).
--  - Nouvelle colonne `semaines.periode_numero` (nullable) : rattache chaque
--    semaine a sa periode. Nullable + backfill => les semaines existantes ne
--    changent pas, et l'UI retombe sur le comportement actuel si c'est null.
--
-- Idempotente (create table if not exists / add column if not exists / policy
-- protegee par bloc DO), donc rejouable sans risque.

-- ── periodes ───────────────────────────────────────────────────────────────
create table if not exists periodes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  numero int not null,               -- 1 a 5
  nom text not null,                 -- ex. "Periode 1"
  date_debut date not null,          -- 1er jour de classe de la periode
  date_fin date not null,            -- dernier jour de classe de la periode
  ordre int not null default 0
);
alter table periodes enable row level security;
do $$ begin
  alter table periodes add constraint periodes_class_numero_key unique (class_id, numero);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Users manage own periodes" on periodes
    using (class_id in (select id from classes where user_id = auth.uid()))
    with check (class_id in (select id from classes where user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── semaines.periode_numero (rattachement, nullable & additif) ─────────────
alter table semaines add column if not exists periode_numero int;
