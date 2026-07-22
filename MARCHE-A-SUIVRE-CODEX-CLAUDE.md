# Marche à suivre : Codex et Claude

Fichier **commun** aux deux assistants qui travaillent sur Ma Progression CP.
Codex y est renvoyé par `AGENTS.md` (qu'il lit automatiquement). Claude Code le voit
via `CLAUDE.md` (qui importe `AGENTS.md` en première ligne). Tout ce qui doit être su
pour reprendre le projet sans rien casser est ici, ou pointé depuis ici.

**Règle d'or de la passation : avant de commencer, lire tout ce fichier + la section
"Journal de passation" en bas. Après avoir travaillé, ajouter une entrée datée dans ce
journal (qui a fait quoi, ce qui reste, où ça en est). C'est ce qui permet à l'autre
assistant de prendre le relais en comprenant tout.**

---

## 1. Ce qu'est le produit

Ma Progression CP est une application web pour les **enseignants de CP** (cours
préparatoire, 6 ans). Elle construit et suit la progression annuelle d'une classe :
méthode de lecture, emploi du temps, progression par matière, suivi des élèves,
cahier journal. Utilisatrice de référence : **Cécile** (enseignante de CP, partenaire
de Christophe). Christophe est le créateur/développeur (solo).

C'est le **produit phare** de Christophe. On ne modifie pas son UI sans son accord
explicite.

## 2. Stack et infrastructure

- **Next.js 16** (App Router, Server Actions, `proxy.ts` et PAS `middleware.ts`),
  React 19, TypeScript, Tailwind. Turbopack.
- **Supabase** (Postgres + Auth + Edge Functions). Projet `odwgkakeepcqbgpsfugl`.
- **Anthropic API** (`@anthropic-ai/sdk`) pour les fonctions IA de l'app (import de
  manuel, chat de correction, bilan élève, génération de journée). Clé
  `ANTHROPIC_API_KEY` en variable d'environnement (serveur, jamais `NEXT_PUBLIC_`).
  Modèle d'import = Sonnet (Opus dépasse le timeout serverless Vercel).
  Note : ceci est l'architecture de L'APP. À ne pas confondre avec l'assistant qui
  développe l'app, lui tourne sur l'abonnement Claude de Christophe.
- **Déploiement** : Vercel, https://ma-progression-cp.vercel.app (team
  `christophemias-projects`). Push sur `main` = déploiement auto.
- **GitHub** : `christopheMia/ma-progression-cp` (attention : `christopheMia`, pas
  `christophe-mialon`). Le token PAT est dans l'URL remote git.

## 3. Conventions non négociables

1. **Tiret cadratin (em-dash, U+2014) BANNI** de toute sortie : réponses, code,
   commentaires, commits, docs, contenu généré. Utiliser virgule, deux-points, point,
   parenthèses ou trait d'union simple. C'est une exigence forte de Christophe (il y
   voit une signature de texte IA). Ce fichier lui-même respecte la règle.
2. **Langue** : parler à Christophe en **français**. Le code, les noms de fichiers,
   les SKILL.md, les commentaires techniques restent en **anglais** quand c'est la
   norme du repo, mais ce projet a beaucoup de commentaires et de libellés en
   français, suivre le style du fichier voisin.
3. **Ne jamais modifier l'UI du produit phare sans accord explicite** de Christophe.
4. **Toute évolution de schéma passe par une migration versionnée** dans
   `supabase/migrations/`. Ne pas modifier le schéma de prod à la main sans migration.
5. **RGPD** : aucune donnée nominative d'élève ne part vers l'IA ni dans les logs.
   Les routes IA envoient des sons/semaines/statuts, jamais les prénoms (placeholder
   `[ELEVE]` remplacé côté navigateur).
6. **Token GitHub** : ne jamais le coller dans le chat (GitHub le révoque). Passer par
   le terminal avec `!` (voir `CLAUDE.md`, section "Règle token GitHub").
7. **Ne rien commiter/pousser sans que Christophe le demande.** Brancher si on n'est
   pas déjà sur une branche de travail.

## 4. Modèle métier (verrouillé le 2026-07-22)

Vocabulaire commun, ne pas le mélanger :

- **Méthode** : le manuel/dispositif d'une matière (français = "Les P'tites Poules",
  maths = "Maths en CP"). Une méthode fournit un **sommaire** (aperçu) et une
  **progression** (contenu complet).
- **Progression** : le contenu à enseigner d'une matière. Sa granularité **suit le
  document source** : par **semaine** si le document parle en semaines (sommaire
  Petites Poules), par **période** si le document parle en périodes (Maths en CP).
  Ne jamais fabriquer un faux découpage semaine par semaine à partir d'un document en
  périodes.
- **Période** : un bloc de **semaines entre deux vacances** (P1 à P5). Une période
  porte **plusieurs compétences de la progression, réparties sur ses semaines**. Pour
  un document en périodes (maths), la progression est rattachée à la **période**
  (source de vérité), et ses compétences s'étalent sur les semaines de cette période.
- **Planning annuel** : la vue de toute l'année, **semaine par semaine**, qui affiche
  la progression. Une semaine montre les compétences de sa période.
- **EDT (emploi du temps)** : les **grandes lignes**, blocs horaires par matière,
  dimensionnés selon les **quotas horaires officiels du cycle 2**. Généré depuis les
  quotas ; l'enseignant remplit à la main les créneaux non couverts par une méthode.
  L'EDT ne contient PAS le détail des notions.
- **Cahier journal** : le détail **jour par jour** = EDT (le créneau) + progression
  (quoi enseigner). C'est ICI que les items du manuel se posent, pas dans l'EDT.

Règles :

1. Chaque matière a **une méthode** (français, maths) **ou pas**. Sans méthode, la
   saisie est **manuelle** (cadrée par programmes officiels + quotas). Ce n'est PAS un
   mode d'import à part : c'est le comportement **par défaut** une fois l'EDT généré,
   donc **pas de bouton "pas de méthode"**.
2. C'est le **document** qui dicte la granularité (semaines ou périodes). L'**IA lit le
   document et s'adapte** seule : elle n'a pas besoin qu'on lui dise le type. D'où
   l'import à **une seule porte** ("dépose ton document"), pas trois cases à classer.
3. Le système **cumule les progressions de TOUTES les matières** (français par semaine,
   maths par période, autres saisies à la main) pour composer :
   - les **périodes complètes** (tout ce qui se travaille sur la période, toutes
     matières confondues),
   - les **cahiers journaux** (pour chaque créneau EDT du jour, l'item de la
     progression de cette matière).
   L'**IA fait le QUOI** (lire/structurer chaque document, amorcer les séances) ; la
   **composition période/journal est surtout déterministe** (créneau -> matière ->
   item), donc fiable.

Manuels de référence de Cécile : Français = "Les P'tites Poules" ; Maths = "Maths en
CP" (Accès, par période). PDF de travail dans `partage/`.

## 5. Design validé de la grille EDT

Le rendu de la grille d'emploi du temps a été **validé par Christophe**. La maquette de
référence est dans le repo : **`docs/design/edt-grille-validee.html`** (ouvrir dans un
navigateur pour la voir). Caractéristiques à respecter :

- **Cellules fusionnées** (`rowSpan`) : une séance qui couvre plusieurs tranches
  horaires n'apparaît qu'une fois, pas de fausses cases vides.
- **Une couleur par FAMILLE de matière** (pas par libellé) : 8 familles (français,
  maths, QLM, EPS, arts, langue vivante, EMC, routines). Voir `COULEURS_FAMILLE`,
  `familleMatiere()`, `couleurAffichee()` dans `src/data/trame-edt.ts`.
- **Tient sur téléphone sans défilement horizontal** : `table-fixed`, colonne horaires
  étroite, jours abrégés (Lun/Mar...) sous 34rem.
- Le composant d'affichage lecture seule `src/components/EdtGrilleLecture.tsx` applique
  déjà ce design. La grille d'ÉDITION `src/components/TimetableGrid.tsx` doit s'en
  rapprocher (chantier en cours, voir Journal).

## 6. Carte des fichiers clés

- `src/app/(app)/setup/page.tsx` : assistant de configuration en 4 étapes (méthode,
  date de rentrée, élèves, EDT).
- `src/components/setup/` : `ManualSelector`, `IaImport`, `RentreeDatePicker`,
  `StudentListEditor`.
- `src/components/TimetableGrid.tsx` : grille EDT éditable.
- `src/components/EdtGrilleLecture.tsx` : grille EDT lecture seule (design validé).
- `src/lib/edt-grille.ts` : calcul de la grille fusionnée (`construireGrille`).
- `src/data/trame-edt.ts` : trame par défaut + familles + couleurs.
- `src/lib/edt-items.ts` : moteur `remplirEnveloppes` (remplit une enveloppe de matière
  avec plusieurs items, max 2h même matière). **Construit et testé mais PAS encore
  branché** dans le générateur.
- `src/lib/actions/setup.ts` : `creerClasse` (écrit classe + élèves + semaines +
  progression + EDT, puis redirige vers /accueil).
- `src/lib/prenoms.ts` : `decouperPrenoms` (collage d'une liste de prénoms d'un coup).
- `supabase/migrations/` : migrations SQL versionnées.
- `CLAUDE.md` : **état détaillé et historique du projet** (auth, IA, thème, prod,
  etc.). Le lire pour tout ce qui n'est pas couvert ici.

## 7. Commandes

- `npm run dev` : serveur local.
- `npm run build` : build de prod (`next build`).
- `npm test` : Jest.
- Type-check : le `tsc` local est dans `node_modules/.bin/tsc`. Depuis la racine du
  projet : `./node_modules/.bin/tsc --noEmit` (ne PAS faire `npx tsc` seul, ça installe
  un faux paquet `tsc`).

## 8. État courant / chantiers ouverts (au 2026-07-22)

- **FAIT (2026-07-22)** : bug de navigation du setup corrigé. Revenir en arrière puis
  en avant ne perd plus les données (méthode, date, 24 élèves, EDT). Chaque étape
  ré-affiche ce qui a été saisi (`initial` propagé depuis le wizard + `onChange` sur
  `TimetableGrid` pour garder un brouillon). Type-check propre.
- **À FAIRE** : étape EDT = proposer un **choix** en haut : "grille vide" ou "générer
  selon les quotas officiels" (blocs larges au bon volume horaire CP). L'EDT reste dans
  les grandes lignes. Quotas à baser sur `partage/les 108h _.docx` + textes officiels
  cycle 2, ajustables ensuite par Christophe.
- **À FAIRE** : simplifier l'import (`IaImport.tsx`) en **une seule porte** ("dépose
  ton document, l'IA s'adapte"), retirer le choix "Manuel / Période / Programmation"
  (les 3 radios qui embrouillent) et NE PAS ajouter de bouton "pas de méthode" (la
  saisie manuelle est le défaut). L'IA détecte seule semaines vs périodes.
- **À FAIRE** : aligner le visuel de la grille d'édition (`TimetableGrid`) sur le design
  validé (`edt-rowspan-demo.html` / `EdtGrilleLecture`).
- **À FAIRE (plus tard)** : brancher `remplirEnveloppes` dans la génération, permettre
  plusieurs méthodes dès le setup (aujourd'hui seul le français au setup, le reste dans
  Paramètres), progression maths stockée PAR PÉRIODE à côté du français PAR SEMAINE, et
  **cumul** des progressions de toutes les matières pour composer périodes complètes et
  cahiers journaux.

## 9. Où trouver quoi (index)

Pour ne pas se perdre. Chaque assistant part d'ICI.

| Ce que tu cherches | Où |
|---|---|
| **Le hub / les règles / l'état** (ce fichier) | `MARCHE-A-SUIVRE-CODEX-CLAUDE.md` (racine) |
| Pointeur que Codex lit d'office | `AGENTS.md` (renvoie ici) |
| **État détaillé et historique** du projet (auth, IA, thème, prod) | `CLAUDE.md` |
| **Maquette EDT validée** (design de référence) | `docs/design/edt-grille-validee.html` |
| Spec EDT généré depuis les quotas | `docs/superpowers/specs/2026-07-19-emploi-du-temps-genere-design.md` |
| Spec programme officiel + LSU | `docs/superpowers/specs/2026-07-19-programme-officiel-lsu-design.md` |
| Retours utilisateurs (Cécile) + backlog | `docs/ANALYSE-RETOURS-CECILE-2026-07-19.md`, `docs/BACKLOG-retours-2026-07-20.md` |
| Notes de reprise de session | `docs/REPRISE-*.md` |
| Migrations de schéma (source de vérité BDD) | `supabase/migrations/` |
| **Documents de travail** (PDF manuels, captures, .docx) | `partage/` (LOCAL, hors git : PDF sous copyright éditeur) |

Règle : un nouveau document de conception va dans `docs/` (ou `docs/superpowers/specs/`
pour une vraie spec), un asset de design de référence dans `docs/design/`. On NE laisse
PAS un document important dans un dossier temporaire. On l'indexe ici.

Idées / options mises de côté (à ne pas oublier) :
- **Suivi des 108h** : justifier les heures faites en dehors avec les élèves (APC :
  quels élèves, quelles dates, quelles compétences, résultat, calcul des heures).
  Fonctionnalité future, distincte du modèle EDT/progression. Source : `partage/les
  108h _.docx`.

---

## Journal de passation

Ajouter en HAUT de cette liste, format : `AAAA-MM-JJ — [assistant] — résumé`.

- **2026-07-22 — Claude Code** : Étape EDT du setup = **choix** ajouté ("générer selon
  les quotas officiels" via `genererEdtCP`, ou "grille vide"). Fini la trame figée
  imposée. Fichiers : `src/app/(app)/setup/page.tsx` (helpers `versCreneaux`,
  `GRILLE_VIDE`, `edtDepuisQuotas` + UI de choix + lien "changer de base"). Maquette EDT
  validée **sauvegardée dans le repo** : `docs/design/edt-grille-validee.html` (n'était
  que dans un dossier temporaire). Ajout de la section 9 "Où trouver quoi". Type-check
  propre. **RESTE (chantier 3)** : restyler la grille d'ÉDITION (`TimetableGrid`) au
  design validé, c'est le plus délicat (garder l'édition). Poussé sur `main`.
- **2026-07-22 — Claude Code** : Vocabulaire et règles **verrouillés avec Christophe**
  (voir sections 4). Points clés actés : période = plusieurs compétences de la
  progression réparties sur ses semaines ; import à une seule porte (l'IA détecte
  semaines/périodes) ; pas de bouton "pas de méthode" (saisie manuelle = défaut) ;
  cumul déterministe des progressions de toutes les matières pour composer périodes
  complètes et cahiers journaux.
- **2026-07-22 — Claude Code** : Correction du bug de navigation du wizard de setup
  (données conservées entre allers-retours d'étapes). Fichiers touchés :
  `src/app/(app)/setup/page.tsx`, `src/components/setup/RentreeDatePicker.tsx`,
  `src/components/setup/StudentListEditor.tsx`, `src/components/setup/ManualSelector.tsx`
  (écran "déjà importé, continuer/réimporter"), `src/components/TimetableGrid.tsx`
  (prop `onChange` + brouillon). Non commité (attendre le feu vert de Christophe).
  Création de ce fichier de passation. Prochaine étape prévue : choix "grille vide /
  quotas" à l'étape EDT, puis alignement visuel de la grille d'édition.
