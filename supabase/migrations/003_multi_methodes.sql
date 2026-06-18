-- supabase/migrations/003_multi_methodes.sql

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
