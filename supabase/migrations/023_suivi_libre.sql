-- 023_suivi_libre.sql
--
-- Le suivi des élèves quitte les cases à cocher pour le texte libre.
--
-- Décision de Christophe du 28/07/2026 : « le suivi des élèves doit se
-- transformer uniquement en zone de texte libre, avec possibilité de mettre la
-- date avec le calendrier, [...] avec un système à code couleur qui dira
-- comment s'est passée chaque semaine ».
--
-- Deux tables, additives. Les anciennes (`acquisitions`,
-- `criteres_observation`) ne sont pas supprimées ici : elles sont vides depuis
-- le nettoyage du 28/07, et les retirer se fera dans une migration à part une
-- fois qu'on sera sûrs de ne pas revenir en arrière.

-- ── Comment s'est passée la semaine ──────────────────────────────────────────
-- UNE seule pastille, et pour le comportement (réponse de Christophe). Trois
-- états. L'absence de ligne veut dire « rien de noté », ce qui n'est pas la
-- même chose qu'une semaine difficile.

create table if not exists public.comportements_semaine (
  class_id uuid references public.classes on delete cascade not null,
  eleve_id uuid references public.eleves on delete cascade not null,
  semaine_id uuid references public.semaines on delete cascade not null,
  etat text not null,
  updated_at timestamptz not null default now(),
  primary key (eleve_id, semaine_id),
  constraint comportements_semaine_etat_valide
    check (etat in ('difficile', 'attention', 'bien'))
);

alter table public.comportements_semaine enable row level security;
create index if not exists comportements_semaine_classe_idx
  on public.comportements_semaine (class_id);

do $$ begin
  create policy "Users manage own weekly behaviour"
    on public.comportements_semaine
    for all
    to authenticated
    using (
      exists (
        select 1 from public.classes c
        where c.id = comportements_semaine.class_id and c.user_id = (select auth.uid())
      )
    )
    with check (
      exists (
        select 1 from public.classes c
        where c.id = comportements_semaine.class_id and c.user_id = (select auth.uid())
      )
    );
exception when duplicate_object then null; end $$;

-- ── Les observations, en texte libre et datées ───────────────────────────────
-- Plusieurs par semaine : ce qu'on voit le lundi et ce qu'on voit le jeudi ne
-- se mélangent pas. Elles ne portent pas de matière : elles nourrissent
-- l'appréciation générale du livret, pas les commentaires par discipline.

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes on delete cascade not null,
  eleve_id uuid references public.eleves on delete cascade not null,
  semaine_id uuid references public.semaines on delete cascade not null,
  observee_le date not null default current_date,
  texte text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.observations enable row level security;
create index if not exists observations_eleve_idx
  on public.observations (eleve_id, observee_le);
create index if not exists observations_semaine_idx
  on public.observations (semaine_id);

do $$ begin
  create policy "Users manage own observations"
    on public.observations
    for all
    to authenticated
    using (
      exists (
        select 1 from public.classes c
        where c.id = observations.class_id and c.user_id = (select auth.uid())
      )
    )
    with check (
      exists (
        select 1 from public.classes c
        where c.id = observations.class_id and c.user_id = (select auth.uid())
      )
    );
exception when duplicate_object then null; end $$;
