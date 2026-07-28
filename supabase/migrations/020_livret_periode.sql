-- 020_livret_periode.sql
--
-- Ce qu'il faut garder pour le livret d'une période (page /livret).
--
-- Trois tables, toutes rattachées à la classe, toutes additives : rien n'est
-- modifié de l'existant, et sans la page /livret elles restent simplement
-- vides. Décisions de Christophe des 27 et 28/07/2026.
--
--   positionnements_periode : ce que l'enseignante CORRIGE du niveau proposé.
--   appreciations_periode   : le commentaire rédigé, UN PAR MATIÈRE.
--   formulations_competence : comment SES mots disent une compétence à un
--                             parent, une phrase par niveau.
--
-- Pourquoi le positionnement n'est stocké que quand il est corrigé : le niveau
-- proposé se recalcule depuis le suivi de la période (`bilan-periode.ts`), et
-- le recalculer garde le livret d'accord avec le suivi. On ne garde donc que
-- ce que le calcul ne peut pas deviner : l'avis de l'enseignante.

-- ── Le positionnement corrigé ────────────────────────────────────────────────

create table if not exists public.positionnements_periode (
  class_id uuid references public.classes on delete cascade not null,
  eleve_id uuid references public.eleves on delete cascade not null,
  periode_numero integer not null,
  competence_id uuid references public.competences_officielles on delete cascade not null,
  niveau text not null,
  updated_at timestamptz not null default now(),
  primary key (class_id, eleve_id, periode_numero, competence_id),
  constraint positionnements_periode_niveau_valide
    check (niveau in ('non_atteint', 'partiellement', 'atteint', 'depasse')),
  constraint positionnements_periode_numero_valide
    check (periode_numero between 1 and 5)
);

alter table public.positionnements_periode enable row level security;
create index if not exists positionnements_periode_eleve_idx
  on public.positionnements_periode (eleve_id, periode_numero);

do $$ begin
  create policy "Users manage own period positions"
    on public.positionnements_periode
    for all
    to authenticated
    using (
      exists (
        select 1 from public.classes c
        where c.id = positionnements_periode.class_id
          and c.user_id = (select auth.uid())
      )
    )
    with check (
      exists (
        select 1 from public.classes c
        where c.id = positionnements_periode.class_id
          and c.user_id = (select auth.uid())
      )
    );
exception when duplicate_object then null; end $$;

-- ── L'appréciation, une par matière ──────────────────────────────────────────
-- Le livret officiel demande un commentaire PAR MATIÈRE, pas un seul pour
-- l'élève. La clé porte donc la matière (demande de Christophe du 27/07 au
-- soir). `briques_ecartees` retient ce que l'enseignante a décoché, pour ne pas
-- le lui represcrire à chaque visite.

create table if not exists public.appreciations_periode (
  class_id uuid references public.classes on delete cascade not null,
  eleve_id uuid references public.eleves on delete cascade not null,
  periode_numero integer not null,
  matiere text not null,
  texte text not null default '',
  briques_ecartees text[] not null default '{}',
  briques_retouchees jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (class_id, eleve_id, periode_numero, matiere),
  constraint appreciations_periode_numero_valide
    check (periode_numero between 1 and 5)
);

alter table public.appreciations_periode enable row level security;
create index if not exists appreciations_periode_eleve_idx
  on public.appreciations_periode (eleve_id, periode_numero);

do $$ begin
  create policy "Users manage own period appreciations"
    on public.appreciations_periode
    for all
    to authenticated
    using (
      exists (
        select 1 from public.classes c
        where c.id = appreciations_periode.class_id
          and c.user_id = (select auth.uid())
      )
    )
    with check (
      exists (
        select 1 from public.classes c
        where c.id = appreciations_periode.class_id
          and c.user_id = (select auth.uid())
      )
    );
exception when duplicate_object then null; end $$;

-- ── Les formulations lisibles par un parent ──────────────────────────────────
-- Le libellé officiel d'une compétence est écrit pour l'institution. Il ne doit
-- jamais atterrir tel quel dans le livret : un parent doit comprendre. Chaque
-- compétence porte donc une phrase par niveau, écrite par l'enseignante, avec
-- ses mots. Elles servent d'une année sur l'autre, donc ce travail ne se fait
-- qu'une fois.
--
-- `suite` n'accompagne que « non atteint » : une difficulté ne s'énonce jamais
-- seule, elle est toujours suivie de ce qu'on va faire.

create table if not exists public.formulations_competence (
  class_id uuid references public.classes on delete cascade not null,
  competence_id uuid references public.competences_officielles on delete cascade not null,
  eclat text not null default '',
  reussite text not null default '',
  encours text not null default '',
  vigilance text not null default '',
  suite text not null default '',
  updated_at timestamptz not null default now(),
  primary key (class_id, competence_id)
);

alter table public.formulations_competence enable row level security;

do $$ begin
  create policy "Users manage own competence wordings"
    on public.formulations_competence
    for all
    to authenticated
    using (
      exists (
        select 1 from public.classes c
        where c.id = formulations_competence.class_id
          and c.user_id = (select auth.uid())
      )
    )
    with check (
      exists (
        select 1 from public.classes c
        where c.id = formulations_competence.class_id
          and c.user_id = (select auth.uid())
      )
    );
exception when duplicate_object then null; end $$;
