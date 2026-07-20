-- 013_notion_competence.sql
--
-- Pont notion <-> compétence officielle (Phase 2). Relie une notion de la
-- progression de la méthode à une compétence officielle détaillée, pour préparer
-- le livret LSU par période. 100% ADDITIF : nouvelle table uniquement.
--
-- La période se déduit de la semaine (semaines.periode_numero). Une notion peut
-- être reliée à une compétence principale ; l'enseignant peut ajouter/corriger.
-- RGPD : ne contient QUE du contenu de méthode (notions), aucun élève.

create table if not exists notion_competence (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  matiere text not null,
  semaine_numero int,
  notion text not null,
  competence_id uuid references competences_officielles on delete cascade not null,
  source text not null default 'ia',   -- 'ia' | 'manuel'
  created_at timestamptz default now()
);
alter table notion_competence enable row level security;
do $$ begin
  alter table notion_competence add constraint notion_competence_unique
    unique (class_id, matiere, semaine_numero, notion, competence_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Users manage own notion_competence" on notion_competence
    using (class_id in (select id from classes where user_id = auth.uid()))
    with check (class_id in (select id from classes where user_id = auth.uid()));
exception when duplicate_object then null; end $$;
