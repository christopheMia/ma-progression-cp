-- supabase/migrations/003_multi_methodes.sql

-- La table appreciations avait ete creee manuellement en production avant
-- cette migration, mais elle manquait dans 001_schema.sql. Sans ce filet de
-- securite, un `supabase db reset` s'arrete plus bas avant d'atteindre la
-- migration 006 qui reconstruit le schema complet.
create table if not exists appreciations (
  id uuid primary key default gen_random_uuid(),
  semaine_id uuid references semaines on delete cascade not null,
  eleve_id uuid references eleves on delete cascade not null,
  statut text,
  commentaire text,
  updated_at timestamptz default now(),
  unique(semaine_id, eleve_id)
);
alter table appreciations enable row level security;
do $$ begin
  create policy "Users manage own appreciations" on appreciations
    using (semaine_id in (
      select s.id from semaines s join classes c on c.id = s.class_id
      where c.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- 1) Nouvelle table progression : contenu d'une methode par matiere x semaine
create table progression (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  matiere text not null,
  numero int not null,
  items text[] not null default '{}',
  pages text,
  mots_exemple text[],
  unique(class_id, matiere, numero)
);
alter table progression enable row level security;
create policy "Users manage own progression" on progression
  using (class_id in (select id from classes where user_id = auth.uid()))
  with check (class_id in (select id from classes where user_id = auth.uid()));

-- 2) Recopie du francais existant (semaines.graphemes -> progression)
insert into progression (class_id, matiere, numero, items, pages, mots_exemple)
select class_id, 'francais', numero, graphemes, manuel_pages, mots_exemple
from semaines;

-- 3) Colonne matiere sur acquisitions (existant = francais)
alter table acquisitions add column matiere text not null default 'francais';
alter table acquisitions drop constraint acquisitions_semaine_id_eleve_id_grapheme_key;
alter table acquisitions add constraint acquisitions_unique
  unique (semaine_id, eleve_id, matiere, grapheme);

-- 4) Colonne matiere sur appreciations (existant = francais)
alter table appreciations add column matiere text not null default 'francais';
alter table appreciations drop constraint appreciations_semaine_id_eleve_id_key;
alter table appreciations add constraint appreciations_unique
  unique (semaine_id, eleve_id, matiere);
