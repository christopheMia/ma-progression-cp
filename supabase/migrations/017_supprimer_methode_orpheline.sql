-- 017_supprimer_methode_orpheline.sql
--
-- Retirer le dernier document d'une methode laissait la methode derriere, vide
-- et `suivi_actif = true`. Constate en vrai le 26/07/2026 : « Maths en CP »
-- restee avec 0 document et 0 ligne de progression apres que Christophe ait
-- supprime sa source. L'enseignante voyait donc une methode fantome qu'aucun
-- ecran ne lui permettait d'enlever.
--
-- `retirer_source_progression` supprime desormais la methode devenue orpheline,
-- dans la meme transaction et sous le meme verrou, donc sans etat intermediaire
-- visible.
--
-- Additif et idempotent : seule la fonction change, aucune donnee n'est touchee.

create or replace function public.retirer_source_progression(
  p_source_id uuid,
  p_lignes jsonb,
  p_source_ids_attendus uuid[]
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
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

  -- Une methode sans aucun document ET sans aucune ligne de progression n'a plus
  -- de raison d'exister. La double condition est volontaire : si un appel
  -- fournissait encore des lignes, on prefere garder la methode plutot que de
  -- supprimer du contenu.
  if not exists (
    select 1 from public.methode_sources ms where ms.methode_id = v_methode_id
  ) and not exists (
    select 1 from public.progression p where p.methode_id = v_methode_id
  ) then
    delete from public.methodes where id = v_methode_id;
  end if;
end;
$function$;
