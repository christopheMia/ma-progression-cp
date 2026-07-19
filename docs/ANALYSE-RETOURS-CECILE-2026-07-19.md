# Analyse des retours de Cécile (essai grandeur nature)

Date : 19 juillet 2026
Source : `partage/essai pour christophe.docx` (retour d'essai de Cécile)
Auteur de l'analyse : AI OS (revue de code Ma Progression CP)

## Résumé

Cécile a testé l'application en conditions réelles et a remonté 3 points. Les
trois sont réels et reproductibles dans le code. Le plus grave est le n°3
(cahier journal vide) : c'est un vrai bug, pas une erreur de manipulation.

| # | Retour de Cécile | Nature | Gravité | Statut |
|---|------------------|--------|---------|--------|
| 1 | Pour le français, je n'ai pu ajouter qu'un PDF (attendait : 5 documents répartis en périodes P1 à P5) | Attente produit | Moyenne | À discuter |
| 2 | Les autres matières ne sont pas accessibles à l'entrée | Parcours (onboarding) | Moyenne | **Corrigé** (invitation sur l'accueil) |
| 3 | Cahier journal non complété même avec le sommaire enregistré | Bug | **Élevée** | **Corrigé** (remplissage auto + régénération + tests) |

---

## Retour n°1 : "Pour le français, je n'ai pu ajouter qu'un PDF" (à discuter)

### Ce qu'elle attendait vraiment (précision de Christophe)
Cécile pensait pouvoir **déposer ses 5 documents** (un par période) et que l'IA
**trouve et répartisse l'année en périodes P1, P2, P3, P4, P5**. Son modèle
mental est celui de l'enseignante : l'année de CP se découpe en 5 périodes entre
les vacances, pas en 36 semaines brutes.

C'est un écart entre le modèle de l'app (36 semaines à plat) et le modèle métier
(5 périodes). C'est le vrai sujet du retour 1, plus que le PDF lui-même.

### Ce qu'elle a vécu
À l'étape 1 de la configuration ("Ta méthode de lecture"), elle a eu le
sentiment de ne pouvoir déposer qu'un PDF.

### Ce que dit le code
Le composant d'import (`src/components/setup/IaImport.tsx`) propose en réalité
**deux** entrées : le dépôt de PDF (ligne 128) **et** une zone de texte pour
coller le sommaire (ligne 133), plus un bouton "Analyser avec l'IA". La
possibilité de coller le sommaire existe donc bien.

Deux causes probables au ressenti de Cécile :
1. **Hiérarchie visuelle** : le champ PDF est en haut et bien visible, la zone
   "coller le sommaire" est en dessous et passe inaperçue. Le bouton violet
   d'analyse est collé sous la zone de texte, ce qui laisse penser qu'il ne
   concerne que le texte.
2. **Aucun catalogue de méthodes connues** : `ManualSelector` ne montre plus
   que l'import IA. Or il existe déjà des méthodes prêtes à l'emploi dans
   `src/data/manuels/` (ex : Lecture Piano). Cécile s'attendait peut-être à
   pouvoir **choisir sa méthode dans une liste** au lieu de tout importer.

### Pistes de correction (à trancher)
- **Multi-documents** : le champ accepte déjà plusieurs PDF (`multiple`), mais
  rien ne l'explique et le résultat reste une liste plate. Rendre explicite
  "Dépose tes documents période par période (P1 à P5)".
- **Modèle par période** : faire produire par l'IA une progression **structurée
  en 5 périodes**, puis dépliée en semaines. C'est l'évolution de fond attendue
  par Cécile. Chantier plus lourd (modèle de données + prompt IA + affichage).
- **Clarté PDF vs texte** : séparer visuellement "Déposer un PDF" et "Coller le
  sommaire", chacun avec son bouton.
- **Liste de méthodes connues** (optionnel) : proposer Piano, etc. sans IA.

### À confirmer avec Cécile / Christophe
Priorité au modèle "5 périodes" ou d'abord la clarté de l'écran d'import ? Le
premier est une vraie fonctionnalité, le second un ajustement rapide.

---

## Retour n°2 : "Les autres matières ne sont pas accessibles dès l'entrée"

> "Il faut d'abord rentrer le français, puis les élèves, et seulement après il
> y a le bouton paramètres qui permet de rentrer les autres matières."

### Ce que dit le code
C'est exact, et c'est voulu par la structure actuelle de l'onboarding :

- L'assistant de configuration (`src/app/(app)/setup/page.tsx`) est en 4 étapes,
  **entièrement centrées sur le français** : 1) méthode de lecture, 2) date de
  rentrée, 3) élèves, 4) emploi du temps. L'étape 1 force la matière française
  (`matiereFixe="francais"`, `ManualSelector.tsx` ligne 18).
- Les autres matières (Maths, Anglais, etc.) ne peuvent être ajoutées qu'ensuite,
  via **Paramètres → "Mes méthodes et acquis des élèves"** (`MethodesEditor.tsx`),
  avec le bouton "➕ Ajouter une nouvelle matière".
- Or la page Paramètres n'est atteignable qu'**une fois la classe créée**
  (`parametres/page.tsx` ligne 30 : `if (!classe) redirect('/setup')`), donc
  seulement après avoir terminé français + rentrée + élèves + emploi du temps.

Conséquence : les matières autres que le français sont de "seconde classe",
reléguées au fond des réglages. Le parcours décrit par Cécile est fidèle à la
réalité du produit.

### Corrections possibles (choix produit)
1. **Rendre les matières visibles tôt** : ajouter, sur l'accueil ou en fin de
   configuration, une invitation claire "➕ Ajouter mes autres matières
   (Maths, Anglais…)".
2. **Étape optionnelle dans l'assistant** : après l'emploi du temps, proposer un
   écran "Veux-tu ajouter d'autres matières maintenant ou plus tard ?".
3. **Renommer la section** dans Paramètres pour qu'elle soit trouvable :
   "📚 Toutes mes matières (Français, Maths, Anglais…)" au lieu de la
   formulation actuelle.

C'est un arbitrage de conception : l'app est aujourd'hui pensée "lecture
d'abord" (cohérent avec le CP), mais Cécile attend un accès plus direct aux
autres matières.

### ✅ Corrigé (19/07)
Option retenue : **invitation sur l'accueil**. Un bloc "Tu enseignes d'autres
matières ?" a été ajouté sur la page d'accueil (`accueil/page.tsx`), qui mène
directement à la section méthodes des Paramètres (ancre `#methodes`). Les
matières restent optionnelles mais deviennent visibles dès l'entrée. Les options
"étape dans l'assistant" et "renommer la section" restent possibles plus tard.

---

## Retour n°3 : "Cahier journal non complété même avec le sommaire enregistré" (BUG)

C'est le point le plus important. Le cahier journal se génère **vide** alors
même que la progression a été enregistrée.

### Cause racine
Le remplissage automatique d'une séance du journal vient de
`deroulementInitial()` dans `src/lib/cahier-journal.ts` (lignes 5 à 14). Cette
fonction ne renvoie du texte **que si** le créneau de l'emploi du temps possède
un `methode_id` **et** qu'une ligne de progression correspond à ce `methode_id` :

```
if (!creneau.methode_id) return ''   // ← créneau non relié => déroulement vide
```

Or **aucun créneau n'est relié à une méthode automatiquement** :

1. À la création de la classe (`src/lib/actions/setup.ts`, lignes 49 à 55), les
   créneaux de l'emploi du temps sont insérés **sans `methode_id`**.
2. Les libellés de la trame (`src/data/trame-edt.ts`) sont "Appropriation des
   graphèmes", "Écriture", "Phonologie", "Mathématiques"… et **ne correspondent
   pas** au code matière des méthodes (`francais`, `maths`). Aucun rapprochement
   automatique n'est donc possible en l'état.
3. Le seul moyen de relier un créneau à une méthode est **manuel et caché** :
   Paramètres → Méthodes → "🗓️ Choisir les créneaux de la semaine"
   (`MethodesEditor.tsx`, `lierCreneaux`). Cécile ne l'a pas fait (rien ne le
   lui indiquait), donc **tous** les déroulements restent vides.

### Un aggravant : le cache
`genererOuChargerJournal()` (`src/lib/actions/journal.ts`, lignes 13 à 14)
enregistre le journal en base à la première génération et renvoie ensuite
**toujours** la version en cache :

```
if (existing) return existing.contenu as JourJournal[]
```

Donc si Cécile relie les créneaux **après** avoir généré le journal une première
fois (vide), le journal restera vide : il n'existe aucun bouton "régénérer".

### Corrections proposées (par ordre de priorité)

**A. Repli par nom de matière (rapide, gros gain).**
Dans `deroulementInitial`, si `methode_id` est absent, tenter un rapprochement
par libellé : les créneaux "graphèmes / écriture / phonologie / vocabulaire /
lecture" pointent vers la méthode `francais`, "maths / calcul" vers `maths`.
Ainsi le journal se remplit même sans liaison manuelle. (La fonction
`couleurMatiere` dans `trame-edt.ts` fait déjà exactement ce type de
rapprochement par mots-clés : on peut réutiliser la même logique.)

**B. Auto-lier les créneaux à la création de la classe.**
Dans `creerClasse`, après avoir créé la méthode française, relier
automatiquement les créneaux "cours" dont le libellé correspond au français.
Plus propre que A sur le fond, mais ne couvre que les nouvelles classes.

**C. Bouton "Régénérer le cahier journal".**
Permettre de forcer une régénération (supprime la ligne `cahier_journal` puis
recrée), pour que les corrections de liaison soient prises en compte.

**D. Guidage.**
Si un journal se génère entièrement vide, afficher un message : "Relie d'abord
tes créneaux à tes méthodes dans Paramètres, ou clique sur ✨ Générer la
journée pour un remplissage par l'IA."

Recommandation : **A + C** en premier (faible risque, débloque tout de suite
Cécile), puis B et D pour la robustesse.

### ✅ Corrigé (19/07)
A et C sont implémentés :
- **A (repli par nom de matière)** : `deroulementInitial` dans `cahier-journal.ts`
  reconnaît maintenant la matière par son libellé (graphèmes / écriture /
  phonologie / vocabulaire / lecture → français ; maths / calcul → maths ; et
  correspondance directe pour les matières personnalisées). Le journal se remplit
  donc **sans** liaison manuelle.
- **C (régénération)** : nouvelle action `regenererJournal` + bouton
  "🔄 Régénérer" dans le cahier journal, pour reprendre en compte les
  corrections après coup.
- **Tests** : 3 cas ajoutés dans `cahier-journal.test.ts` (français non relié,
  calcul non relié, matière personnalisée). 9/9 tests verts.

Restent en réserve (non bloquants) : B (auto-liaison à la création) et D
(message d'aide si journal totalement vide).

---

## État au 19/07

- ✅ **Retour 3 (bug cahier journal)** : corrigé (remplissage auto + régénération
  + tests). Prêt à tester par Cécile.
- ✅ **Retour 2 (autres matières)** : corrigé (invitation sur l'accueil).
- 🗣️ **Retour 1 (import / périodes P1-P5)** : en discussion. C'est le seul point
  ouvert, et le plus structurant (modèle "36 semaines" vs "5 périodes").

Aucune de ces corrections ne touche aux données existantes de Cécile. La base
Supabase a été réactivée le 19/07 et ses tables sont intactes. Les changements
sont locaux (non encore déployés) : à vérifier puis à pousser sur Vercel.

## Prochaine décision (retour 1)
Priorité au modèle "5 périodes" (vraie fonctionnalité, chantier IA + données) ou
d'abord un simple ajustement de l'écran d'import (clarté PDF / texte, multi-docs
explicite) ? À trancher avec Cécile.
