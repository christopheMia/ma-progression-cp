create table classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  manuel_id text not null,
  rentree_date date not null,
  created_at timestamptz default now()
);
alter table classes enable row level security;
create policy "Users manage own class" on classes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table eleves (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  prenom text not null,
  ordre int not null
);
alter table eleves enable row level security;
create policy "Users manage own students" on eleves
  using (class_id in (select id from classes where user_id = auth.uid()));

create table semaines (
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
create policy "Users manage own weeks" on semaines
  using (class_id in (select id from classes where user_id = auth.uid()));

create table acquisitions (
  id uuid primary key default gen_random_uuid(),
  semaine_id uuid references semaines on delete cascade not null,
  eleve_id uuid references eleves on delete cascade not null,
  grapheme text not null,
  acquis boolean default false,
  unique(semaine_id, eleve_id, grapheme)
);
alter table acquisitions enable row level security;
create policy "Users manage own acquisitions" on acquisitions
  using (semaine_id in (
    select s.id from semaines s
    join classes c on c.id = s.class_id
    where c.user_id = auth.uid()
  ));

create table emploi_du_temps (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  jour text not null,
  heure_debut time not null,
  heure_fin time not null,
  matiere text not null,
  ordre int not null
);
alter table emploi_du_temps enable row level security;
create policy "Users manage own timetable" on emploi_du_temps
  using (class_id in (select id from classes where user_id = auth.uid()));

create table cahier_journal (
  id uuid primary key default gen_random_uuid(),
  semaine_id uuid references semaines on delete cascade not null unique,
  contenu jsonb not null,
  updated_at timestamptz default now()
);
alter table cahier_journal enable row level security;
create policy "Users manage own journal" on cahier_journal
  using (semaine_id in (
    select s.id from semaines s
    join classes c on c.id = s.class_id
    where c.user_id = auth.uid()
  ));
