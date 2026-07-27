-- 018_criteres_observation.sql
--
-- Critères d'observation personnalisés par notion et résultats par élève.
-- Migration additive : les acquisitions historiques restent inchangées.

create table if not exists public.criteres_observation (
  id uuid primary key default gen_random_uuid(),
  semaine_id uuid references public.semaines on delete cascade not null,
  matiere text not null,
  notion text not null,
  libelle text not null,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint criteres_observation_libelle_non_vide check (length(trim(libelle)) > 0),
  constraint criteres_observation_unique unique (semaine_id, matiere, notion, libelle)
);

alter table public.criteres_observation enable row level security;
create index if not exists criteres_observation_semaine_idx
  on public.criteres_observation (semaine_id);

do $$ begin
  create policy "Users manage own observation criteria"
    on public.criteres_observation
    for all
    to authenticated
    using (
      exists (
        select 1
        from public.semaines s
        join public.classes c on c.id = s.class_id
        where s.id = criteres_observation.semaine_id
          and c.user_id = (select auth.uid())
      )
    )
    with check (
      exists (
        select 1
        from public.semaines s
        join public.classes c on c.id = s.class_id
        where s.id = criteres_observation.semaine_id
          and c.user_id = (select auth.uid())
      )
    );
exception when duplicate_object then null; end $$;

create table if not exists public.acquisitions_criteres (
  critere_id uuid references public.criteres_observation on delete cascade not null,
  eleve_id uuid references public.eleves on delete cascade not null,
  acquis boolean not null,
  updated_at timestamptz not null default now(),
  primary key (critere_id, eleve_id)
);

alter table public.acquisitions_criteres enable row level security;
create index if not exists acquisitions_criteres_eleve_idx
  on public.acquisitions_criteres (eleve_id);

do $$ begin
  create policy "Users manage own criterion acquisitions"
    on public.acquisitions_criteres
    for all
    to authenticated
    using (
      exists (
        select 1
        from public.criteres_observation co
        join public.semaines s on s.id = co.semaine_id
        join public.classes c on c.id = s.class_id
        join public.eleves e on e.id = acquisitions_criteres.eleve_id
        where co.id = acquisitions_criteres.critere_id
          and e.class_id = s.class_id
          and c.user_id = (select auth.uid())
      )
    )
    with check (
      exists (
        select 1
        from public.criteres_observation co
        join public.semaines s on s.id = co.semaine_id
        join public.classes c on c.id = s.class_id
        join public.eleves e on e.id = acquisitions_criteres.eleve_id
        where co.id = acquisitions_criteres.critere_id
          and e.class_id = s.class_id
          and c.user_id = (select auth.uid())
      )
    );
exception when duplicate_object then null; end $$;

revoke all on table public.criteres_observation from anon;
revoke all on table public.acquisitions_criteres from anon;
grant select, insert, update, delete on table public.criteres_observation to authenticated;
grant select, insert, update, delete on table public.acquisitions_criteres to authenticated;
