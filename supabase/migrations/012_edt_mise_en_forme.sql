-- 012_edt_mise_en_forme.sql
--
-- Mise en forme du texte des cases de l'emploi du temps (demande Christophe) :
-- gras, italique, souligne. 100% ADDITIF : booleens avec defaut false.
alter table emploi_du_temps add column if not exists texte_gras boolean not null default false;
alter table emploi_du_temps add column if not exists texte_italique boolean not null default false;
alter table emploi_du_temps add column if not exists texte_souligne boolean not null default false;
