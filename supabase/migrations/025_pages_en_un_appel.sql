-- Une fonction par grosse page : toutes ses lectures en UN aller-retour.
--
-- Mesure du 30/07/2026 (journaux Vercel, [perf]) : un appel Supabase coute de
-- 120 a 360 ms quelle que soit la table, et les appels "paralleles" se
-- serialisent en partie a l'ouverture des connexions. Chaque page payait donc
-- classe PUIS sa vague, soit 320 a 420 ms de requetes. Une fonction SQL rend
-- tout en un seul appel (~150 ms).
--
-- Regles tenues par ces fonctions :
-- - `security invoker` (defaut) : la RLS s'applique a l'interieur exactement
--   comme pour les requetes directes. Sans session, tout revient vide.
-- - Le filtre par classe reste EXPLICITE (where class_id = ...) : on ne
--   s'appuie pas sur la seule RLS, la cible produit inclut les remplacants
--   multi-classes (decision de Christophe, 29/07).
-- - Les colonnes rendues portent les memes noms que les tables : le code
--   TypeScript lit les memes champs qu'avant.

-- ---------------------------------------------------------------------------
-- Le solde IA, partage par page_accueil et page_parametres.
-- Meme regle que sommeCoutDepuis (src/lib/ia/cout.ts) : sans releve tout
-- compte, avec releve seules les lignes datees a partir du releve comptent.
create or replace function public.solde_ia_json()
returns jsonb
language sql
stable
set search_path = public
as $$
  with repere as (
    select solde_usd, releve_at from ia_solde limit 1
  )
  select jsonb_build_object(
    'solde_releve_usd', (select solde_usd from repere),
    'releve_at', (select releve_at from repere),
    'consomme_usd', coalesce((
      select sum(u.cout_usd) from ia_usage u
      where (select releve_at from repere) is null
         or u.created_at >= (select releve_at from repere)
    ), 0)
  )
$$;

-- ---------------------------------------------------------------------------
create or replace function public.page_accueil()
returns jsonb
language sql
stable
set search_path = public
as $$
  with classe as (
    select * from classes order by created_at desc limit 1
  )
  select jsonb_build_object(
    'classe', (select to_jsonb(c) from classe c),
    'semaines', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.numero)
      from semaines s, classe c where s.class_id = c.id
    ), '[]'::jsonb),
    'nb_eleves', coalesce((
      select count(*) from eleves e, classe c where e.class_id = c.id
    ), 0),
    'methodes', coalesce((
      select jsonb_agg(jsonb_build_object('matiere', m.matiere, 'manuel', m.manuel)
                       order by m.created_at)
      from methodes m, classe c where m.class_id = c.id
    ), '[]'::jsonb),
    'nb_acquis', coalesce((
      select count(*)
      from acquisitions a
      join semaines s on s.id = a.semaine_id
      join classe c on s.class_id = c.id
      where a.acquis
    ), 0),
    'solde', public.solde_ia_json()
  )
$$;

-- ---------------------------------------------------------------------------
create or replace function public.page_planning()
returns jsonb
language sql
stable
set search_path = public
as $$
  with classe as (
    select * from classes order by created_at desc limit 1
  )
  select jsonb_build_object(
    'classe', (select to_jsonb(c) from classe c),
    'semaines', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.numero)
      from semaines s, classe c where s.class_id = c.id
    ), '[]'::jsonb),
    'eleves', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id))
      from eleves e, classe c where e.class_id = c.id
    ), '[]'::jsonb),
    'periodes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'numero', p.numero, 'nom', p.nom, 'date_debut', p.date_debut,
        'date_fin', p.date_fin, 'ordre', p.ordre) order by p.ordre)
      from periodes p, classe c where p.class_id = c.id
    ), '[]'::jsonb),
    'progression', coalesce((
      select jsonb_agg(jsonb_build_object(
        'numero', pr.numero, 'matiere', pr.matiere, 'methode_id', pr.methode_id,
        'items', pr.items, 'pages', pr.pages, 'mots_exemple', pr.mots_exemple)
        order by pr.numero)
      from progression pr, classe c where pr.class_id = c.id
    ), '[]'::jsonb),
    'methodes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'matiere', m.matiere, 'manuel', m.manuel,
        'suivi_actif', m.suivi_actif) order by m.created_at)
      from methodes m, classe c where m.class_id = c.id
    ), '[]'::jsonb),
    'acquisitions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'semaine_id', a.semaine_id, 'eleve_id', a.eleve_id,
        'matiere', a.matiere, 'grapheme', a.grapheme))
      from acquisitions a
      join semaines s on s.id = a.semaine_id
      join classe c on s.class_id = c.id
      where a.acquis
    ), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------------
create or replace function public.page_parametres()
returns jsonb
language sql
stable
set search_path = public
as $$
  with classe as (
    select * from classes order by created_at desc limit 1
  )
  select jsonb_build_object(
    'classe', (select to_jsonb(c) from classe c),
    'eleves', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.ordre)
      from eleves e, classe c where e.class_id = c.id
    ), '[]'::jsonb),
    'edt', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.ordre)
      from emploi_du_temps t, classe c where t.class_id = c.id
    ), '[]'::jsonb),
    'methodes', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at)
      from methodes m, classe c where m.class_id = c.id
    ), '[]'::jsonb),
    'progression', coalesce((
      select jsonb_agg(jsonb_build_object('methode_id', pr.methode_id, 'items', pr.items))
      from progression pr, classe c where pr.class_id = c.id
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(to_jsonb(ms) order by ms.created_at)
      from methode_sources ms
      join methodes m on m.id = ms.methode_id
      join classe c on m.class_id = c.id
    ), '[]'::jsonb),
    'solde', public.solde_ia_json()
  )
$$;

-- ---------------------------------------------------------------------------
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
        'id', sc.id, 'numero', sc.numero, 'periode_numero', sc.periode_numero)
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
