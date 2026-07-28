-- 021_eleve_genre.sql
--
-- Le genre de l'élève, pour écrire « Il » ou « Elle » dans le livret.
--
-- Trouvé le 28/07/2026 en faisant tourner le modèle de rédaction sur des
-- élèves de démonstration : il écrivait « Elle » pour tout le monde, donc
-- faux pour un garçon sur deux. Un prénom ne dit pas le genre, et le deviner
-- serait se tromper sur de vrais enfants.
--
-- Colonne facultative : tant qu'elle est vide, la rédaction répète le prénom
-- au lieu d'employer un pronom. Le texte est plus lourd, mais jamais faux.

alter table public.eleves add column if not exists genre text;

do $$ begin
  alter table public.eleves add constraint eleves_genre_valide
    check (genre is null or genre in ('f', 'm'));
exception when duplicate_object then null; end $$;
