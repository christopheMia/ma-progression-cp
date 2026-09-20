-- Le suivi des eleves recoit toutes les semaines de la classe par la fonction
-- page_semaine. Jusqu'ici chaque semaine portait son identifiant, son numero et
-- sa periode, mais pas sa date de debut. L'interface ne pouvait donc pas relier
-- une date d'observation a la semaine correspondante.
--
-- Signature inchangee. Seul le bloc semaines_classe gagne date_debut.
create or replace function public.page_semaine(p_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  with sem as (
    select * from semaines where id = p_id
  )
  select jsonb_build_object(
    'semaine', (select to_jsonb(s) from sem s),
    'eleves', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.ordre)
      from eleves e, sem s where e.class_id = s.class_id
    ), '[]'::jsonb),
    'acquisitions', coalesce((
      select jsonb_agg(to_jsonb(a))
      from acquisitions a where a.semaine_id = p_id
    ), '[]'::jsonb),
    'appreciations', coalesce((
      select jsonb_agg(to_jsonb(ap))
      from appreciations ap where ap.semaine_id = p_id
    ), '[]'::jsonb),
    'progression', coalesce((
      select jsonb_agg(to_jsonb(pr))
      from progression pr, sem s
      where pr.class_id = s.class_id and pr.numero = s.numero
    ), '[]'::jsonb),
    'methodes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'matiere', m.matiere, 'suivi_actif', m.suivi_actif,
        'manuel', m.manuel) order by m.created_at)
      from methodes m, sem s where m.class_id = s.class_id
    ), '[]'::jsonb),
    'edt', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.ordre)
      from emploi_du_temps t, sem s where t.class_id = s.class_id
    ), '[]'::jsonb),
    'semaines_classe', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sc.id, 'numero', sc.numero, 'periode_numero', sc.periode_numero, 'date_debut', sc.date_debut)
        order by sc.numero)
      from semaines sc, sem s where sc.class_id = s.class_id
    ), '[]'::jsonb),
    'comportements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'eleve_id', cs.eleve_id, 'semaine_id', cs.semaine_id, 'etat', cs.etat))
      from comportements_semaine cs, sem s where cs.class_id = s.class_id
    ), '[]'::jsonb),
    'observations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'eleve_id', o.eleve_id, 'semaine_id', o.semaine_id,
        'observee_le', o.observee_le, 'texte', o.texte))
      from observations o, sem s where o.class_id = s.class_id
    ), '[]'::jsonb),
    'bilans_periode', coalesce((
      select jsonb_agg(jsonb_build_object(
        'eleve_id', b.eleve_id, 'texte', b.texte,
        'briques_ecartees', b.briques_ecartees))
      from appreciations_periode b, sem s
      where b.class_id = s.class_id
        and b.matiere = '__general'
        and b.periode_numero = coalesce(s.periode_numero, 0)
    ), '[]'::jsonb)
  )
$$;
