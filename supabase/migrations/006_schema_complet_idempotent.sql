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

-- Remplacement atomique de la progression (migration 014).
-- Cette definition doit preceder les fonctions qui enregistrent les sources.
create or replace function remplacer_progression(
  p_class_id uuid,
  p_methode_id uuid,
  p_matiere text,
  p_numeros integer[],
  p_lignes jsonb,
  p_sync_semaines boolean default false
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from classes
    where id = p_class_id and user_id = auth.uid()
  ) then
    raise exception 'Classe introuvable ou non autorisee';
  end if;

  if not exists (
    select 1 from methodes
    where id = p_methode_id and class_id = p_class_id and matiere = p_matiere
  ) then
    raise exception 'Methode incompatible avec la classe ou la matiere';
  end if;

  if jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes de progression doivent former une liste';
  end if;

  if p_numeros is not null and exists (
    select 1
    from jsonb_to_recordset(p_lignes) as x(numero integer)
    where not (x.numero = any(p_numeros))
  ) then
    raise exception 'Une semaine sort de la zone de remplacement';
  end if;

  delete from progression
  where class_id = p_class_id
    and matiere = p_matiere
    and (p_numeros is null or numero = any(p_numeros));

  insert into progression (
    class_id, methode_id, matiere, numero, items, pages, mots_exemple
  )
  select
    p_class_id,
    p_methode_id,
    p_matiere,
    x.numero,
    coalesce(x.items, '{}'),
    nullif(x.pages, ''),
    x.mots_exemple
  from jsonb_to_recordset(p_lignes) as x(
    numero integer,
    items text[],
    pages text,
    mots_exemple text[]
  );

  if p_sync_semaines then
    if p_matiere <> 'francais' then
      raise exception 'La synchronisation des semaines est reservee au francais';
    end if;

    update semaines s
    set graphemes = coalesce(x.items, '{}'),
        manuel_pages = nullif(x.pages, ''),
        mots_exemple = coalesce(x.mots_exemple, '{}')
    from jsonb_to_recordset(p_lignes) as x(
      numero integer,
      items text[],
      pages text,
      mots_exemple text[]
    )
    where s.class_id = p_class_id and s.numero = x.numero;
  end if;
end;
$$;

revoke all on function remplacer_progression(uuid, uuid, text, integer[], jsonb, boolean) from public;
grant execute on function remplacer_progression(uuid, uuid, text, integer[], jsonb, boolean) to authenticated;

-- Sources structurees et operations atomiques (migration 016).
-- Le setup futur doit appeler ces RPC sequentiellement avec le dernier
-- snapshot connu, jamais inserer ou supprimer directement une source.
create table if not exists public.methode_sources (
  id uuid primary key default gen_random_uuid(),
  methode_id uuid references public.methodes on delete cascade not null,
  nom_source text not null,
  type_document text not null,
  periode_numero integer,
  niveau_precision smallint not null,
  contenu_structure jsonb not null,
  empreinte_contenu text not null,
  created_at timestamptz not null default now(),
  unique (methode_id, empreinte_contenu),
  constraint methode_sources_document_coherent check (
    (
      type_document = 'manuel'
      and periode_numero is null
      and niveau_precision = 1
    )
    or (
      type_document = 'programmation'
      and periode_numero is null
      and niveau_precision = 2
    )
    or (
      type_document = 'periode'
      and periode_numero is not null
      and periode_numero between 1 and 5
      and niveau_precision = 3
    )
  ),
  constraint methode_sources_contenu_structure_check check (
    jsonb_typeof(contenu_structure) = 'object'
    and contenu_structure ? 'semaines'
    and jsonb_typeof(contenu_structure -> 'semaines') = 'array'
    and contenu_structure ? 'periodes'
    and jsonb_typeof(contenu_structure -> 'periodes') = 'array'
  )
);

alter table public.methode_sources enable row level security;

do $$ begin
  create policy "Users select own methode sources" on public.methode_sources
    for select
    using (
      exists (
        select 1
        from public.methodes m
        join public.classes c on c.id = m.class_id
        where m.id = methode_sources.methode_id
          and c.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

revoke all on table public.methode_sources from anon, authenticated;
grant select on table public.methode_sources to authenticated;

create or replace function public.enregistrer_source_progression(
  p_class_id uuid,
  p_methode_id uuid,
  p_matiere text,
  p_nom_source text,
  p_type_document text,
  p_periode_numero integer,
  p_niveau_precision smallint,
  p_contenu_structure jsonb,
  p_empreinte_contenu text,
  p_lignes jsonb,
  p_source_ids_attendus uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_id uuid;
  v_source_ids_actuels uuid[];
  v_source_ids_attendus_tries uuid[];
begin
  if not exists (
    select 1
    from public.methodes m
    join public.classes c on c.id = m.class_id
    where m.id = p_methode_id
      and m.class_id = p_class_id
      and m.matiere = p_matiere
      and c.user_id = auth.uid()
  ) then
    raise exception 'Methode incompatible avec la classe ou la matiere';
  end if;

  if p_lignes is null or pg_catalog.jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes de progression doivent former une liste';
  end if;

  if p_source_ids_attendus is null then
    raise exception 'Les documents ont change, recharge puis reessaie';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_methode_id::text, 0)
  );

  select coalesce(
    pg_catalog.array_agg(attendu.source_id order by attendu.source_id),
    '{}'::uuid[]
  )
  into v_source_ids_attendus_tries
  from pg_catalog.unnest(p_source_ids_attendus) as attendu(source_id);

  select coalesce(
    pg_catalog.array_agg(ms.id order by ms.id),
    '{}'::uuid[]
  )
  into v_source_ids_actuels
  from public.methode_sources ms
  where ms.methode_id = p_methode_id;

  if v_source_ids_attendus_tries is distinct from v_source_ids_actuels then
    raise exception 'Les documents ont change, recharge puis reessaie';
  end if;

  insert into public.methode_sources (
    methode_id,
    nom_source,
    type_document,
    periode_numero,
    niveau_precision,
    contenu_structure,
    empreinte_contenu
  )
  values (
    p_methode_id,
    p_nom_source,
    p_type_document,
    p_periode_numero,
    p_niveau_precision,
    p_contenu_structure,
    p_empreinte_contenu
  )
  returning id into v_source_id;

  perform public.remplacer_progression(
    p_class_id,
    p_methode_id,
    p_matiere,
    null,
    p_lignes,
    false
  );

  return v_source_id;
end;
$$;

create or replace function public.retirer_source_progression(
  p_source_id uuid,
  p_lignes jsonb,
  p_source_ids_attendus uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class_id uuid;
  v_methode_id uuid;
  v_matiere text;
  v_source_ids_actuels uuid[];
  v_source_ids_attendus_tries uuid[];
begin
  select m.class_id, m.id, m.matiere
  into v_class_id, v_methode_id, v_matiere
  from public.methode_sources ms
  join public.methodes m on m.id = ms.methode_id
  join public.classes c on c.id = m.class_id
  where ms.id = p_source_id
    and c.user_id = auth.uid();

  if not found then
    raise exception 'Source introuvable ou non autorisee';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_methode_id::text, 0)
  );

  if p_lignes is null or pg_catalog.jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes de progression doivent former une liste';
  end if;

  if p_source_ids_attendus is null then
    raise exception 'Les documents ont change, recharge puis reessaie';
  end if;

  select coalesce(
    pg_catalog.array_agg(attendu.source_id order by attendu.source_id),
    '{}'::uuid[]
  )
  into v_source_ids_attendus_tries
  from pg_catalog.unnest(p_source_ids_attendus) as attendu(source_id);

  select coalesce(
    pg_catalog.array_agg(ms.id order by ms.id),
    '{}'::uuid[]
  )
  into v_source_ids_actuels
  from public.methode_sources ms
  where ms.methode_id = v_methode_id;

  if v_source_ids_attendus_tries is distinct from v_source_ids_actuels then
    raise exception 'Les documents ont change, recharge puis reessaie';
  end if;

  delete from public.methode_sources
  where id = p_source_id;

  perform public.remplacer_progression(
    v_class_id,
    v_methode_id,
    v_matiere,
    null,
    p_lignes,
    false
  );
end;
$$;

revoke all on function public.enregistrer_source_progression(uuid, uuid, text, text, text, integer, smallint, jsonb, text, jsonb, uuid[]) from public;
grant execute on function public.enregistrer_source_progression(uuid, uuid, text, text, text, integer, smallint, jsonb, text, jsonb, uuid[]) to authenticated;

revoke all on function public.retirer_source_progression(uuid, jsonb, uuid[]) from public;
grant execute on function public.retirer_source_progression(uuid, jsonb, uuid[]) to authenticated;
