# Retours de Christophe, 26 juillet 2026

Source : `partage/probleme a regler.pdf` (hors git, copyright). Contenu recopié ici
pour qu'il survive aux sessions et que Codex comme Claude puissent le reprendre.

Statut au moment de la saisie : **rien n'est commencé**, sauf le point 4.2 qui a été
traité le jour même (voir plus bas).

---

## 1. Règles métier à respecter (méthodologie et planning)

- **Méthodes de français** : supports type « Les p'tites poules », avec sommaire et
  progression intégrés.
- **Planning annuel** : structure hebdomadaire détaillée, incluant la progression
  pédagogique.
- **Détail des périodes** : planification précise des séances, semaine par semaine.
- **Gestion hors méthode** : saisie manuelle pour les matières régies par les
  programmes officiels et les quotas réglementaires.
- **Règle d'emploi du temps** : les mathématiques, le code et l'étude de la langue
  sont **impérativement placés le matin**.
- **L'IA doit analyser et interpréter ces règles** pour s'adapter aux contraintes
  métier, au lieu de les ignorer.

## 2. Interface et expérience (UI/UX)

| # | Demande | Note |
|---|---|---|
| 2.1 | **Bouton « Valider » après chaque saisie de progression**, pour éviter un défilement trop long. | Touche `SourceContentPreview` / `SourceImporter`. |
| 2.2 | **Importer un emploi du temps existant** (PDF ou DOC) avant la génération automatique. | Une route d'import EDT existe déjà côté prompt (`SYSTEM_IMPORT_EDT`, `userImportEdt`) : vérifier ce qui est déjà branché avant de recoder. |
| 2.3 | **Barre d'outils de mise en forme** (couleurs, soulignement) : ajouter une validation explicite pour fermer la fenêtre. | **FAIT le 31/07 (`7f34d06`)**. Le panneau n'avait qu'une sortie : recliquer le crayon, cible de 10 px à moitié transparente, invisible sur téléphone faute de survol. Ajout d'un bouton « Terminé » pleine largeur en pied de panneau et de la touche Échap. Le crayon reste une bascule. 3 tests dans `TimetableGrid.rendu.test.tsx`. |
| 2.4 | **Refonte du suivi des élèves** : alléger visuellement, corriger le cadrage, raccourcir les intitulés trop longs. | **PUBLIÉ le 27/07**, migration 018 appliquée en base. Suivi par notion, critères personnalisables, états Acquis ou Non acquis par élève. Reste la validation de Christophe dans l'appli. |

## 3. Bugs identifiés

| # | Bug | Statut |
|---|---|---|
| 3.1 | **Fréquence des mathématiques** : la progression génère **trois séances par semaine au lieu d'une**. | **CORRIGÉ le 26/07 (`ac0a8f3`)**, pas encore validé par Christophe. Deux causes : `normalizeProgression` ne fusionnait pas les entrées de même numéro de semaine, et `repartirProgrammation` empilait deux blocs décrivant la même période. Détail dans `MARCHE-A-SUIVRE-CODEX-CLAUDE.md`. |
| 3.2 | **Résidus « Explorer le monde »** à supprimer. | **FAIT le 26/07** : c'était `EDM_PROGRESSION_CP` posé d'office sur les 36 semaines par `genererSqueletteSemaines` (commit `632302d`), plus les 36 lignes nettoyées en base. À faire confirmer par Christophe. |
| 3.3 | **Lisibilité de l'EDT généré** : contraste majeur, le texte s'affiche en blanc ou très clair alors que les paramètres enregistrés disent noir. Lecture impossible. | **CORRIGÉ le 26/07 (`6661eda`)**, pas encore validé par Christophe. Ce n'était pas `couleur_texte` : `globals.css` gardait le bloc `prefers-color-scheme: dark` du gabarit Next, qui repeint le texte en clair sur une interface entièrement blanche. Détail dans `MARCHE-A-SUIVRE-CODEX-CLAUDE.md`. |

## 4. Décision sur le cahier journal

- Christophe a demandé le retrait du bouton « Générer la journée ». Le bouton, sa
  route IA, son prompt et son test ont été supprimés localement le 26/07.
- Les entrées du cahier journal sont désormais modifiables et supprimables une par
  une. Les autres entrées restent conservées.

---

## Ordre de traitement suggéré

Les bugs d'abord, parce qu'ils rendent l'outil inutilisable ou faux :

1. **3.3 contraste de l'EDT** : un emploi du temps illisible ne sert à rien.
2. **3.1 maths en triple** : fausse la progression, donc le cahier journal.
3. **4 le cahier journal** : décision prise et traitée localement.
4. Puis l'UI/UX (2.1 à 2.3), et enfin les règles métier du point 1, qui demandent
   un vrai cadrage avec lui (notamment « maths, code et étude de la langue le matin »,
   qui touche au générateur d'emploi du temps).
