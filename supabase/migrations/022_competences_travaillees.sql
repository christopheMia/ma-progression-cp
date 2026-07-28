-- 022_competences_travaillees.sql
--
-- Les compétences officielles travaillées pendant une période.
--
-- Virage du 28/07/2026, décision de Christophe : « la base doit être les
-- compétences officielles uniquement, pas besoin de jour 1, jour 2 ; c'est
-- l'utilisateur qui gère au fur et à mesure grâce au programme. »
--
-- L'application partait des notions du manuel, qu'il fallait rattacher une par
-- une aux compétences (`notion_competence`). On inverse : le manuel sert à
-- préparer la classe, et le livret se remplit depuis le programme officiel.
-- Cécile coche ce que la classe a travaillé, c'est tout.
--
-- La sélection vaut pour la CLASSE et pour une PÉRIODE : une compétence peut
-- être travaillée en période 2 puis reprise en période 4, et le livret de
-- chaque période doit dire ce qui a été travaillé pendant elle.
-- Le positionnement, lui, reste par élève (`positionnements_periode`).

create table if not exists public.competences_travaillees (
  class_id uuid references public.classes on delete cascade not null,
  periode_numero integer not null,
  competence_id uuid references public.competences_officielles on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (class_id, periode_numero, competence_id),
  constraint competences_travaillees_periode_valide
    check (periode_numero between 1 and 5)
);

alter table public.competences_travaillees enable row level security;
create index if not exists competences_travaillees_periode_idx
  on public.competences_travaillees (class_id, periode_numero);

do $$ begin
  create policy "Users manage own worked competences"
    on public.competences_travaillees
    for all
    to authenticated
    using (
      exists (
        select 1 from public.classes c
        where c.id = competences_travaillees.class_id
          and c.user_id = (select auth.uid())
      )
    )
    with check (
      exists (
        select 1 from public.classes c
        where c.id = competences_travaillees.class_id
          and c.user_id = (select auth.uid())
      )
    );
exception when duplicate_object then null; end $$;
