-- Prénom de l'enseignant (pour l'accueil « Bonjour … » et l'assistant IA)
alter table classes add column if not exists prenom_enseignant text;
