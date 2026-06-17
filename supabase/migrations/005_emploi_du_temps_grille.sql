-- supabase/migrations/005_emploi_du_temps_grille.sql
-- Grille d'emploi du temps : couleur par case + distinction cours / routine.
alter table emploi_du_temps add column couleur text;
alter table emploi_du_temps add column type text not null default 'cours';
-- Les créneaux existants restent 'cours' (valeur par défaut), couleur nulle.
