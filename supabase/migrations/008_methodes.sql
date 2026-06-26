-- 008_methodes.sql — généralisation des méthodes à n'importe quelle matière.
-- Idempotent. Crée la table `methodes`, relie EDT + progression, et reprend
-- les données existantes (1 méthode par (class_id, matiere), créneaux reliés
-- par l'ancienne logique mots-clés). Voir spec 2026-06-25-methodes-par-matiere.

-- ── table methodes ────────────────────────────────────────────────────────
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

-- ── lien créneau ↔ méthode + visibilité journal ───────────────────────────
alter table emploi_du_temps add column if not exists methode_id uuid references methodes on delete set null;
alter table emploi_du_temps add column if not exists visible_journal boolean not null default true;

-- ── progression rattachée à une méthode ───────────────────────────────────
alter table progression add column if not exists methode_id uuid references methodes on delete cascade;

-- ── backfill 1 : une méthode par (class_id, matiere), reliée à progression ─
do $$
declare r record; mid uuid;
begin
  for r in select distinct class_id, matiere from progression where methode_id is null loop
    select id into mid from methodes where class_id = r.class_id and matiere = r.matiere limit 1;
    if mid is null then
      insert into methodes (class_id, matiere, suivi_actif)
        values (r.class_id, r.matiere, true) returning id into mid;
    end if;
    update progression set methode_id = mid
      where class_id = r.class_id and matiere = r.matiere and methode_id is null;
  end loop;
end $$;

-- ── backfill 2 : relier les créneaux EDT via l'ancienne logique mots-clés ──
do $$
declare r record; mid uuid;
begin
  for r in select id, class_id, matiere from emploi_du_temps where methode_id is null loop
    mid := null;
    if lower(r.matiere) like '%graphème%' or lower(r.matiere) like '%graphe%' then
      select id into mid from methodes where class_id = r.class_id and matiere = 'francais' limit 1;
    elsif lower(r.matiere) like '%math%' or lower(r.matiere) like '%calcul%' then
      select id into mid from methodes where class_id = r.class_id and matiere = 'maths' limit 1;
    end if;
    if mid is not null then
      update emploi_du_temps set methode_id = mid where id = r.id;
    end if;
  end loop;
end $$;
