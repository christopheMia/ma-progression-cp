-- 011_edt_couleur_texte.sql
--
-- Couleurs personnalisables des cases de l'emploi du temps (demande Christophe).
-- `emploi_du_temps.couleur` (fond) existe deja ; on ajoute la couleur du TEXTE.
-- 100% ADDITIF : colonne nullable, defaut null (le texte garde sa couleur heritee).
alter table emploi_du_temps add column if not exists couleur_texte text;
