-- Une seance du document = une entree. La journee n'avait aucun endroit ou
-- exister : elle ne survivait que dans le prefixe texte « Jour N : » d'un item.
--
-- CETTE MIGRATION AJOUTE LA COLONNE, ET RIEN D'AUTRE.
--
-- Le plan d'origine posait la colonne ET reprenait l'existant dans le meme
-- fichier, par un « update progression » global. Decision du 3 septembre 2026,
-- confirmee le 9 : couper en deux. La raison n'est pas technique, elle est
-- humaine. Cecile a 154 semaines de progression reelles dans cette base depuis
-- le 26 juillet. Un update global les touche toutes d'un coup, sans possibilite
-- de regarder le resultat avant qu'il soit partout.
--
-- Ici : la colonne arrive vide, avec un defaut. Aucune ligne existante n'est
-- modifiee, aucune lecture ni ecriture actuelle ne change de comportement.
-- L'application deployee ignore cette colonne, donc rien ne bouge pour elle.
--
-- Le remplissage vit dans supabase/remplissage/028_remplir_seances.sql, se
-- declenche classe par classe, et s'essaie sur la classe de test avant
-- d'atteindre celle de Cecile.
alter table progression
  add column if not exists seances jsonb not null default '[]'::jsonb;

comment on column progression.seances is
  'Les seances de la semaine, une par jour d''ecole. Vide tant que la reprise de l''existant n''a pas ete lancee pour cette classe, voir supabase/remplissage/028_remplir_seances.sql';
