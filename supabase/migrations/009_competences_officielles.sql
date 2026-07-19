-- 009_competences_officielles.sql
-- Referentiel officiel des "attendus de fin d'annee" (eduscol), pour aligner la
-- progression (issue du manuel de l'enseignante) au programme officiel.
--
-- Principes (voir spec docs/superpowers/specs/2026-07-19-programme-officiel-lsu-design.md) :
--   - Donnee de REFERENCE, partagee par toutes les classes (pas par utilisateur).
--   - VERSIONNEE : le programme evolue chaque annee -> champ version_programme,
--     les anciennes versions sont conservees. La mise a jour = reimport de donnees,
--     pas une modif de code.
--   - Alimentee par un import admin (structuration IA des PDF eduscol), via le
--     role service qui contourne la RLS. Les enseignants la lisent seulement.
--
-- Migration ADDITIVE et idempotente : ne touche a AUCUNE table existante.
-- Non appliquee a la prod tant que la sauvegarde + validation ne sont pas faites.

create table if not exists competences_officielles (
  id uuid primary key default gen_random_uuid(),
  cycle int not null default 2,
  niveau text not null default 'CP',
  matiere text not null,                 -- 'francais' | 'maths' | ...
  domaine text not null,                 -- ex : "Lecture et comprehension de l'ecrit"
  code text,                             -- code court optionnel (ex : "LEC-1")
  libelle text not null,                 -- l'attendu officiel (texte)
  version_programme text not null,       -- ex : "2025"
  source text,                           -- ex : URL eduscol / "attendus CP"
  ordre int not null default 0,
  created_at timestamptz default now()
);

alter table competences_officielles enable row level security;

-- Lecture ouverte a tout utilisateur authentifie (referentiel commun).
do $$ begin
  create policy "Authenticated can read competences_officielles"
    on competences_officielles for select
    using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- Pas de policy d'ecriture cote enseignant : l'alimentation passe par le role
-- service (migrations / import admin), qui contourne la RLS.

-- Une competence est unique dans une version donnee du programme.
do $$ begin
  alter table competences_officielles
    add constraint competences_off_unique
    unique (version_programme, matiere, domaine, libelle);
exception when duplicate_object then null; end $$;

create index if not exists idx_comp_off_lookup
  on competences_officielles (version_programme, niveau, matiere);
