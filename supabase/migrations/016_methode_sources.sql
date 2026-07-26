-- Conserve chaque document structure importe pour une methode.
-- Les mutations passent uniquement par les fonctions atomiques ci-dessous.
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

-- Supabase peut accorder des droits de table par defaut. Les roles applicatifs
-- gardent seulement la lecture, filtree par la policy ci-dessus.
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
