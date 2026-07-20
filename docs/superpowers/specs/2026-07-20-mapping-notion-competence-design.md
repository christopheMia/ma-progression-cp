# Pont notion ↔ compétence officielle ↔ période (Phase 2)

Date : 2026-07-20
Statut : design, à valider avec Christophe avant implémentation.

## But

Relier ce que Cécile enseigne (les **notions** de la progression de sa méthode)
aux **compétences officielles** détaillées (référentiel `competences_officielles`,
49 français + 24 maths), en les plaçant dans la bonne **période** (P1-P5). C'est
le pont entre « ce que Cécile enseigne » et « le programme officiel », et la base
du livret LSU.

## Données existantes

- `progression` : notions par (class_id, matiere, numero=semaine, methode_id),
  `items text[]` = la liste des notions de la semaine.
- `semaines` : ont maintenant `periode_numero` (via le réalignement calendaire).
- `competences_officielles` : référentiel détaillé (matiere, domaine, libelle).

## Modèle additif

Nouvelle table `notion_competence` :
- `id`, `class_id`
- `matiere`
- `semaine_numero` (la notion vient d'une semaine) → période dérivée via `semaines`
- `notion` (text : le libellé de la notion, tel quel)
- `competence_id` (FK → competences_officielles)
- `source` ('ia' | 'manuel')
- `created_at`
- RLS par classe, comme les autres tables.

100 % additif : aucune table existante modifiée.

## Flux

1. **Mapping IA** (action serveur, via la route IA de l'app) : pour chaque notion
   de la progression d'une matière, on envoie à Claude le libellé de la notion +
   la liste des compétences officielles de cette matière ; il renvoie la (ou les)
   compétence(s) la/les plus proche(s). **RGPD OK** : les notions sont du contenu
   de méthode, pas des données élèves (aucun prénom envoyé).
2. **Stockage** des suggestions dans `notion_competence` (source='ia'), **éditable**.
3. **Édition manuelle** : l'enseignant peut changer/valider la compétence associée
   à chaque notion (menu déroulant), source passe à 'manuel'.
4. **Période** : dérivée de la semaine de la notion (déjà `periode_numero`).

## Interface (première version)

- Un écran « Programme couvert » (accessible depuis « Mes outils IA ») :
  - par matière, liste des notions de la progression, chacune avec sa compétence
    officielle rattachée (badge éditable) et sa période.
  - un bouton « Proposer les rattachements avec l'IA » (remplit les vides).
  - une vue « par compétence » : quelles compétences officielles sont couvertes,
    lesquelles ne le sont pas encore (trous du programme), et dans quelle période.

## Ce que ça prépare (Phase 3, séparée)

Le **livret LSU** : pour chaque période, l'état des compétences officielles
travaillées (4 niveaux : Non atteint / Partiellement / Atteint / Dépassé), à
partir du suivi des élèves + de ce mapping. Export PDF.

## Points à valider avant de coder

1. Granularité du mapping : une notion → UNE compétence principale (simple), ou
   plusieurs compétences possibles par notion (plus fidèle, plus complexe) ?
2. Déclenchement IA : tout d'un coup (toutes les notions de l'année), ou par
   période / par matière (plus léger, plus contrôlable) ?
3. L'écran « Programme couvert » : on greffe sur la fiche semaine existante, ou
   c'est une nouvelle page dédiée dans « Mes outils IA » ?
