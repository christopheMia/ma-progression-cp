-- 031_regles_rangement.sql
--
-- Le carnet de rangement d'une classe : « Chant va dans Musique ».
-- Conception validée le 18/10/2026 :
-- docs/superpowers/specs/2026-10-18-carnet-de-rangement-design.md
--
-- Migration additive : aucune table existante n'est modifiée. Un carnet vide
-- laisse le cahier journal identique à celui d'avant.
--
-- Accès : comme methode_sources (016), seul le propriétaire de la classe voit
-- ses règles. Contrairement à 016, l'appli écrit directement : une règle est
-- une ligne seule, sans autre table à garder cohérente (modèle de 018).

create table if not exists public.regles_rangement (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes on delete cascade not null,
  -- Le type tel qu'écrit (« Écoute musicale »).
  type text not null,
  -- Le type comparé : sans accents, sans la marque du pluriel (cleType).
  type_cle text not null,
  -- Le nom de la case, tel qu'écrit dans emploi_du_temps.matiere.
  creneau text not null,
  -- Jour préféré, pour ce qui n'a pas de jour. Vide : aucun.
  jour text,
  origine text not null default 'main',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint regles_rangement_type_non_vide check (length(trim(type)) > 0 and length(trim(type_cle)) > 0),
  constraint regles_rangement_creneau_non_vide check (length(trim(creneau)) > 0),
  constraint regles_rangement_jour_valide check (jour is null or jour in ('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi')),
  constraint regles_rangement_origine_valide check (origine in ('main', 'cahier', 'ia')),
  constraint regles_rangement_unique unique (class_id, type_cle)
);

alter table public.regles_rangement enable row level security;

do $$ begin
  create policy "Users manage own storage rules"
    on public.regles_rangement
    for all
    to authenticated
    using (
      exists (
        select 1
        from public.classes c
        where c.id = regles_rangement.class_id
          and c.user_id = (select auth.uid())
      )
    )
    with check (
      exists (
        select 1
        from public.classes c
        where c.id = regles_rangement.class_id
          and c.user_id = (select auth.uid())
      )
    );
exception when duplicate_object then null; end $$;

-- Supabase peut accorder des droits de table par défaut : on repart de rien,
-- puis on rend aux enseignantes connectées ce que la policy filtre.
revoke all on table public.regles_rangement from anon, authenticated;
grant select, insert, update, delete on table public.regles_rangement to authenticated;
