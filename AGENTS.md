<!-- BEGIN:nextjs-agent-rules -->
# Ce n'est PAS le Next.js que vous connaissez

Cette version contient des changements majeurs, les APIs, les conventions et la structure des fichiers peuvent différer de vos données d'entraînement. Lisez le guide correspondant dans `node_modules/next/dist/docs/` avant d'écrire du code. Respectez les avertissements de dépréciation.
<!-- END:nextjs-agent-rules -->

# À lire en premier

**[`A-LIRE-EN-PREMIER.md`](./A-LIRE-EN-PREMIER.md)** : le plan du projet. Une page,
une question, une destination. Ouvre-le AVANT tout le reste.

Ce projet garde son état dans douze documents. Le routeur dit lequel répond à quoi,
et surtout **où en est le chantier en cours**, qui n'est pas dans le fichier au nom
le plus officiel. Posé le 06/08/2026, après qu'un point d'étape périmé a failli
servir de source de vérité.

## La marche à suivre partagée

**[`MARCHE-A-SUIVRE-CODEX-CLAUDE.md`](./MARCHE-A-SUIVRE-CODEX-CLAUDE.md)** est le
fichier commun aux deux assistants (Codex et Claude) : modèle métier, conventions
non négociables (dont le tiret cadratin banni), design validé de l'emploi du temps,
carte des fichiers, commandes, et le **journal de passation** où chaque assistant
note ce qu'il a fait avant de passer la main. Ajoute-y ton entrée datée quand tu as
terminé.

Il fait 140 Ko : **y chercher la section qui te concerne, ne pas le lire en entier**.
L'ancienne consigne disait de le lire intégralement avant de coder, ce qui n'est plus
tenable et poussait à ne pas l'ouvrir du tout.

Pour l'état détaillé et historique du projet (auth, IA, thème, prod), voir `CLAUDE.md`.
