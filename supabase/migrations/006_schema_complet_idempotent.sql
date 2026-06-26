-- 006_schema_complet_idempotent.sql
--
-- Filet de sécurité / source de vérité du schéma.
-- Contexte : le schéma de prod a longtemps été géré en partie À LA MAIN
-- (la table `appreciations` n'était dans AUCUNE migration ; un reset du projet a
-- fait disparaître `emploi_du_temps` et `cahier_journal`). Résultat : un
-- `supabase db reset` depuis le dépôt ne reconstruisait pas une base valide.
--
-- Cette migration recrée TOUT le schéma attendu de façon IDEMPOTENTE
-- (`create table if not exists`, `add column if not exists`, policies/contraintes
-- protégées par des blocs DO). Elle est donc :
--   - un no-op sur une base déjà à jour (prod actuelle),
--   - auto-réparatrice sur une base vide / reset.
--
-- PROCÉDURE DE RÉCUPÉRATION (si la prod est à nouveau vidée/cassée) :
--   exécuter CE SEUL fichier sur une base vide → tout le schéma est recréé.
--   NE PAS compter sur un replay de la chaîne 001→005 : elle n'est PAS rejouable
--   proprement (la 003 modifie `appreciations`, absente de la 001 ; un reset perd
--   `emploi_du_temps`/`cahier_journal`). Ce fichier 006 est la source de vérité.
--
-- À l'avenir : toute évolution de schéma DOIT passer par une migration versionnée.

-- ── classes ───────────────────────────────────────────────────────────────
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  manuel_id text not null,
  rentree_date date not null,
  created_at timestamptz default now()
);
alter table classes add column if not exists prenom_enseignant text;
alter table classes enable row level security;
do $$ begin
  create policy "Users manage own class" on classes
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ── eleves ────────────────────────────────────────────────────────────────
create table if not exists eleves (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  prenom text not null,
  ordre int not null
);
alter table eleves enable row level security;
do $$ begin
  create policy "Users manage own students" on eleves
    using (class_id in (select id from classes where user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── semaines (squelette temporel + colonnes lecture historiques) ──────────
create table if not exists semaines (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  numero int not null,
  date_debut date not null,
  graphemes text[] not null,
  edm_theme text not null,
  edm_competences text not null,
  manuel_pages text,
  mots_exemple text[],
  note text
);
alter table semaines enable row level security;
do $$ begin
  create policy "Users manage own weeks" on semaines
    using (class_id in (select id from classes where user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── acquisitions (suivi étoiles, par matière) ─────────────────────────────
create table if not exists acquisitions (
  id uuid primary key default gen_random_uuid(),
  semaine_id uuid references semaines on delete cascade not null,
  eleve_id uuid references eleves on delete cascade not null,
  grapheme text not null,
  acquis boolean default false
);
alter table acquisitions add column if not exists matiere text not null default 'francais';
alter table acquisitions enable row level security;
do $$ begin
  alter table acquisitions add constraint acquisitions_unique
    unique (semaine_id, eleve_id, matiere, grapheme);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Users manage own acquisitions" on acquisitions
    using (semaine_id in (
      select s.id from semaines s join classes c on c.id = s.class_id
      where c.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- ── appreciations (bilan + commentaire, par matière) ──────────────────────
create table if not exists appreciations (
  id uuid primary key default gen_random_uuid(),
  semaine_id uuid references semaines on delete cascade not null,
  eleve_id uuid references eleves on delete cascade not null,
  statut text,
  commentaire text,
  updated_at timestamptz default now()
);
alter table appreciations add column if not exists matiere text not null default 'francais';
alter table appreciations enable row level security;
do $$ begin
  alter table appreciations add constraint appreciations_unique
    unique (semaine_id, eleve_id, matiere);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Users manage own appreciations" on appreciations
    using (semaine_id in (
      select s.id from semaines s join classes c on c.id = s.class_id
      where c.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- ── progression (contenu d'une méthode par matière × semaine) ─────────────
create table if not exists progression (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  matiere text not null,
  numero int not null,
  items text[] not null default '{}',
  pages text,
  mots_exemple text[]
);
alter table progression enable row level security;
-- Nom = celui généré par la contrainte inline de 003 en prod (no-op si déjà là).
do $$ begin
  alter table progression add constraint progression_class_id_matiere_numero_key
    unique (class_id, matiere, numero);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Users manage own progression" on progression
    using (class_id in (select id from classes where user_id = auth.uid()))
    with check (class_id in (select id from classes where user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── emploi_du_temps (grille : couleur + cours/routine) ────────────────────
create table if not exists emploi_du_temps (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  jour text not null,
  heure_debut time not null,
  heure_fin time not null,
  matiere text not null,
  ordre int not null
);
alter table emploi_du_temps add column if not exists couleur text;
alter table emploi_du_temps add column if not exists type text not null default 'cours';
alter table emploi_du_temps enable row level security;
do $$ begin
  create policy "Users manage own timetable" on emploi_du_temps
    using (class_id in (select id from classes where user_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- ── cahier_journal ────────────────────────────────────────────────────────
create table if not exists cahier_journal (
  id uuid primary key default gen_random_uuid(),
  semaine_id uuid references semaines on delete cascade not null unique,
  contenu jsonb not null,
  updated_at timestamptz default now()
);
alter table cahier_journal enable row level security;
do $$ begin
  create policy "Users manage own journal" on cahier_journal
    using (semaine_id in (
      select s.id from semaines s join classes c on c.id = s.class_id
      where c.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- ── methodes (migration 008) ──────────────────────────────────────────────
create table if not exists methodes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  matiere text not null,
  manuel text,
  niveau text,
  suivi_actif boolean not null default true,
  created_at timestamptz default now()
);
alter table methodes enable row level security;
do $$ begin
  create policy "Users manage own methodes" on methodes
    using (class_id in (select id from classes where user_id = auth.uid()))
    with check (class_id in (select id from classes where user_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table methodes add constraint methodes_class_matiere_key unique (class_id, matiere);
exception when duplicate_object then null; end $$;
alter table emploi_du_temps add column if not exists methode_id uuid references methodes on delete set null;
alter table emploi_du_temps add column if not exists visible_journal boolean not null default true;
alter table progression add column if not exists methode_id uuid references methodes on delete cascade;
