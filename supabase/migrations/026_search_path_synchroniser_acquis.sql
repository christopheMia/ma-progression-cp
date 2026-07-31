-- Fixe le `search_path` de `synchroniser_acquis_depuis_niveau`.
--
-- Dernier point ouvert de l audit de securite du 30/07/2026. Les trois autres
-- fonctions du schema le declarent deja ; celle-ci, ecrite dans la migration
-- 019, avait ete oubliee.
--
-- Pourquoi ca compte : sans `search_path` fixe, une fonction resout ses noms
-- d objets selon le chemin de l APPELANT. Quelqu un capable de creer un schema
-- place en tete de ce chemin pourrait y poser un objet de meme nom que celui
-- attendu et detourner l execution. Le risque est theorique ici (la fonction ne
-- touche que `new`, elle ne nomme aucune table), mais une fonction declenchee
-- automatiquement a chaque ecriture sur les acquisitions merite la ceinture.
--
-- `''` plutot que `public` : cette fonction n a besoin d AUCUN schema, autant
-- ne lui en donner aucun. C est la convention deja retenue pour les fonctions
-- `security definer` de la migration 006.
--
-- Le corps est identique a celui de la 019 : seule l en-tete change. Les deux
-- declencheurs (`acquisitions_sync_acquis` et
-- `acquisitions_criteres_sync_acquis`) continuent de pointer sur cette fonction,
-- un `create or replace` ne les casse pas.

create or replace function public.synchroniser_acquis_depuis_niveau()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.acquis := new.niveau in ('atteint', 'depasse');
  return new;
end;
$$;
