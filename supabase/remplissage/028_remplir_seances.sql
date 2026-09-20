-- Reprise de l'existant pour la colonne progression.seances
-- CE FICHIER N'EST PAS UNE MIGRATION. Il ne part pas tout seul.
--
-- Pourquoi il est a part : il modifie des lignes que Cecile a reellement
-- remplies. La migration 028 pose la colonne sans toucher a rien ; ce script,
-- lui, ecrit. Il se lance UNE CLASSE A LA FOIS, et la classe de test passe
-- avant celle de Cecile.
--
-- Ce qu'il fait : chaque item d'une semaine devient une seance. Le numero de
-- jour est lu dans le prefixe « Jour N : » quand il y est, sinon la seance
-- reste sans jour (elle ira dans la liste « a placer »). Le libelle est l'item
-- prive de ce prefixe.
--
-- Il ne touche jamais une semaine qui a deja des seances : la clause
-- jsonb_array_length(seances) = 0 le garantit, donc le relancer deux fois de
-- suite ne fait rien la seconde fois.

-- ETAPE 1, regarder avant d'ecrire. Remplacer <CLASS_ID>.
select numero, array_length(items, 1) as nb_items, jsonb_array_length(seances) as nb_seances
from progression
where class_id = '<CLASS_ID>'
order by numero
limit 10;

-- ETAPE 2, ecrire, pour cette classe seulement.
update progression p
set seances = (
  select coalesce(jsonb_agg(jsonb_build_object(
    'jour',    nullif((regexp_match(item, '^\s*[Jj]ours?\s*(\d+)\s*[:.\-]'))[1], '')::int,
    'domaine', '',
    'libelle', regexp_replace(item, '^\s*[Jj]ours?\s*\d+\s*[:.\-]\s*', '')
  ) order by ord), '[]'::jsonb)
  from unnest(p.items) with ordinality as t(item, ord)
)
where p.class_id = '<CLASS_ID>'
  and jsonb_array_length(p.seances) = 0
  and coalesce(array_length(p.items, 1), 0) > 0;

-- ETAPE 3, verifier. nb_seances doit valoir nb_items sur chaque ligne.
select numero, array_length(items, 1) as nb_items, jsonb_array_length(seances) as nb_seances
from progression
where class_id = '<CLASS_ID>'
order by numero;
