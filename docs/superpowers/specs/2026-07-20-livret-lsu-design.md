# Livret LSU (bilan périodique) — Phase 3

Date : 2026-07-20
Statut : design, à valider (une question clé ci-dessous).

## But

Produire le **bilan périodique LSU** au format officiel (cf. `partage/exemple lsu.pdf`) :
par matière et sous-domaine, la liste des **éléments du programme travaillés durant
la période**, chacun positionné sur **4 niveaux** (Non atteint / Partiellement atteint
/ Atteint / Dépassé), plus une **appréciation**. Exportable en PDF, par élève.

## Données disponibles (déjà en base)

- `notion_competence` : notions ↔ compétences officielles (+ période). → donne les
  **éléments travaillés par période** (colonnes 1-2 du LSU). ✅ Phase 2.
- `acquisitions` : suivi « étoiles » par (semaine, élève, notion, matière, acquis bool).
- `appreciations` : par (semaine, élève, matière) : `statut` + `commentaire`. → source
  de l'**appréciation** du livret.
- `periodes` : bornes P1-P5 ; le LSU se remplit par période, regroupables en
  semestre/trimestre (2-3 fois/an, choix d'école).

## Le point à trancher : d'où viennent les 4 niveaux ?

Le LSU officiel = l'enseignant coche UN niveau par élément et par élève. Trois façons
de l'alimenter :

- **A. Depuis le suivi « étoiles » existant** : on agrège les acquisitions des notions
  rattachées à une compétence sur la période → un pourcentage → un niveau (via un
  barème). Zéro double-saisie, mais dépend de la finesse du suivi étoiles.
- **B. Depuis une évaluation chiffrée** : l'enseignant saisit un score (ex. 10/15) par
  compétence ; conversion via la règle de Christophe (diviser l'échelle par 3 sans
  « dépassé », par 4 avec ; « dépassé » seulement si tout est juste). Correspond
  exactement à ce qu'il a décrit.
- **C. Coche manuelle** : l'enseignant coche directement le niveau (le plus proche du
  LSU papier), avec A ou B comme aide/pré-remplissage.

Recommandation : **C par défaut (coche manuelle) + pré-remplissage proposé par A**
(le suivi étoiles existe déjà), et **B disponible en option** (saisir un score qui se
convertit automatiquement). L'enseignant garde toujours le dernier mot.

## Barème de conversion (règle Christophe)

Score = bonnes réponses / total. Échelle divisée par **3** (Non atteint / Partiellement
/ Atteint) si on n'utilise pas « dépassé », par **4** si « dépassé » est un niveau à
part entière. Option : « dépassé » seulement si 100 % juste. Réglable par l'enseignant.

## Modèle additif

Nouvelle table `bilan_lsu` :
- `id`, `class_id`, `eleve_id`, `competence_id`, `periode_numero`
- `niveau` ('non_atteint' | 'partiellement' | 'atteint' | 'depasse')
- `score_num`, `score_den` (optionnels, si saisi via une éval chiffrée)
- `source` ('auto' | 'manuel')
- `updated_at`
- unique (class_id, eleve_id, competence_id, periode_numero) ; RLS par classe.

L'appréciation vient de `appreciations.commentaire` (agrégée par élève/période).

## Écran + export

- Page « Livret » : choix de la période (ou semestre/trimestre) + choix de l'élève.
  Tableau LSU (domaines → éléments travaillés → 4 niveaux cochables) pré-rempli.
- Bouton « Générer le PDF » au format officiel.
- Réglages : nombre de bilans/an (2 ou 3), usage ou non de « dépassé ».

## Ordre de construction

1. Table `bilan_lsu` (additive) + réglages.
2. Pré-remplissage A (agrégation du suivi étoiles → niveau proposé).
3. Écran de saisie/ajustement des niveaux par élève et période.
4. Option B (saisie d'un score → conversion).
5. Export PDF au format officiel + appréciation depuis `appreciations`.

## Question à Christophe avant de coder

Quelle méthode de niveaux on met en place EN PREMIER : la coche manuelle avec
pré-remplissage depuis le suivi étoiles (A+C), ou la saisie de scores chiffrés
convertis par ton barème (B) ?
