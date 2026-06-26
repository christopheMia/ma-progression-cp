# Assistant de départ — plusieurs méthodes + étape « passable » — Design

**Date :** 2026-06-26
**Contexte :** suite de « méthodes par matière » (Plan 2/2, branche `feat/methodes-par-matiere`).

## Problème

À l'étape 1 de l'assistant de configuration (`/setup`), l'enseignante doit importer **une** méthode de lecture (français) pour avancer. Conséquences :

1. **On ne peut pas passer l'étape** sans importer quelque chose. Or, en début d'année, l'enseignante n'a souvent **pas encore** sa méthode → elle est **bloquée**.
2. On ne peut entrer **qu'une** méthode au départ (la lecture). Les autres matières (maths, anglais…) obligent à revenir plus tard dans Paramètres → allers-retours.

## Objectif

À l'étape « méthodes » de l'assistant :
- Permettre d'ajouter **plusieurs méthodes** dès le départ (Français, Maths, et d'autres matières libres).
- Permettre de **passer l'étape** sans rien importer (bouton « Continuer » qui marche toujours).
- Tout reste **modifiable plus tard** dans Paramètres → Mes méthodes.

## Décision clé : découpler le calendrier des méthodes

Aujourd'hui, la méthode de lecture **fabrique** les 36 semaines. Il faut séparer :

- **Le calendrier (36 semaines)** se crée **à partir de la date de rentrée**, indépendamment de toute méthode. Si aucune méthode lecture n'est importée, on crée **36 semaines vides** (dates calculées, contenu vide).
- **Les méthodes** viennent **remplir** le contenu (graphèmes/notions par semaine), qu'elles soient importées au départ ou ajoutées ensuite.

## Comportement de l'étape « méthodes » (UI)

Réutilise la logique de l'écran « Mes méthodes » des Paramètres :

- Une liste affiche **Français** et **Maths** déjà proposés (les 2 matières principales).
- Chaque matière : bouton **« 📥 Importer maintenant »** (ouvre l'import IA) ou rien (laisser vide).
- Bouton **« ➕ Ajouter une matière »** pour saisir une matière libre (Anglais, Sciences, EMC…).
- Une fois une matière importée, elle s'affiche comme « ✓ importée » (modifiable).
- En bas : **un seul bouton « Continuer → »** qui fonctionne **même si rien n'est importé**.
- Sous le bouton, une phrase rassurante :
  > « Tu n'as pas encore tes méthodes ? Pas de souci, continue : tu pourras les importer quand tu veux dans Paramètres → Mes méthodes. »

## Ce qui se passe à la création de la classe

À la fin de l'assistant (`creerClasse`) :

1. Créer la classe (comme aujourd'hui).
2. **Créer les 36 semaines** à partir de la date de rentrée :
   - Si une méthode **lecture/français** a été importée → les semaines portent ses graphèmes/pages (comme aujourd'hui).
   - Sinon → **36 semaines vides** (dates seulement, `graphemes = []`, pages/mots vides).
3. Pour **chaque méthode importée** (français, maths, ou autre) : créer la ligne `methodes` + remplir la table `progression` pour cette matière (réutilise la logique `enregistrerProgressionMatiere` / `ensureMethode`).
4. Insérer l'emploi du temps (inchangé).

## ⏸️ EN ATTENTE — chronologie à valider avec Cécile

L'**ordre des étapes** de l'assistant n'est **pas figé** : Christophe va demander à Cécile
l'enchaînement le plus naturel pour elle (ex. Emploi du temps → Méthodes → Élèves → Lier, ou autre).
**On ne construit l'assistant qu'une fois cet ordre connu.**

**Contrainte technique d'ordonnancement :** lier un créneau à une méthode exige que **l'emploi du
temps ET les méthodes existent déjà**. Donc l'étape « lier » vient toujours **après** ces deux-là
(ou se reporte dans Paramètres).

## Exigences transverses (toutes étapes)

- **Toutes les étapes sont « passables »** : on peut continuer même s'il manque des éléments
  (pas seulement l'étape méthodes). Chaque étape qui n'est pas remplie pourra l'être plus tard
  dans Paramètres — l'expliquer clairement à l'écran.
- **Boutons « Retour »** sur chaque étape, pour naviguer dans les deux sens (← Précédent / Continuer →).
- **Lier les créneaux aux méthodes pendant l'assistant** : proposé directement dans la config
  (puisqu'on y est), avec l'option de le faire plus tard dans Paramètres si l'enseignante préfère.

  **Message clair quand la liaison n'est pas encore possible** (il manque l'EDT ou les méthodes) :
  ne jamais afficher un bouton inerte sans explication. Afficher un encadré du type :
  > « Pour relier tes créneaux à une méthode, tu dois d'abord avoir rempli **ton emploi du temps**
  > et importé **au moins une méthode**. Une fois les deux faits, tu pourras cocher quels créneaux
  > utilisent chaque méthode — ici, ou plus tard dans **Paramètres → Mes méthodes**. »

  Adapter le message selon ce qui manque (EDT seul, méthodes seules, ou les deux).

## Périmètre

**Dans ce design :**
- Étape « méthodes » multi-matières + passable.
- Découplage calendrier ↔ méthode lecture (36 semaines vides possibles).
- Toutes les étapes passables + boutons Retour.
- Liaison créneaux↔méthodes possible pendant l'assistant (après EDT + méthodes).
- Cohérence du « tu » et des explications claires (déjà entamée).

**Hors périmètre (plus tard) :**
- Suivi élèves opt-in pendant l'assistant (reste dans Paramètres).

## Risques / points d'attention

- Les pages qui lisent `semaine.graphemes` doivent supporter un tableau **vide** (déjà le cas : « Révisions / pas de nouveauté » s'affiche si vide).
- `genererProgression` doit avoir un **mode « calendrier vide »** quand aucune méthode lecture n'est fournie.
- Ne pas casser le mode démo (qui passe par `chargerClasseDemo`, chemin séparé).
