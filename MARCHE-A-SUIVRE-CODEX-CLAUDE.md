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

**FAIT et EN LIGNE sur `main` (déployé)** :
- Bug de navigation du setup corrigé (données conservées entre allers-retours).
- Étape EDT = **choix** "grille vide" / "générer selon les quotas officiels"
  (`genererEdtCP`, arrêté 9/11/2015). Plus de trame figée imposée.
- Import IA à **une seule porte** (`IaImport.tsx` + `schema-import-auto.ts`) : l'IA
  reconnaît seule manuel / planning de période / programmation annuelle ; le choix de
  la période n'apparaît qu'après détection. Fini les 3 radios.
- Grille d'édition (`TimetableGrid`) au **design validé** : fusion, couleurs par
  famille, largeur téléphone, jours courts.
- Calendrier officiel + zones A/B/C, périodes P1-P5, semaines calées (vacances
  sautées). Migrations **014 et 015 appliquées en prod et vérifiées**.

**RESTE À FAIRE** :
1. **Test réel (Christophe)** : recréer une classe, importer français (Petites Poules)
   + maths (Maths en CP par période), vérifier le calage des périodes et la détection
   auto de l'import de bout en bout.
2. **Le CUMUL**. Investigation Claude du 2026-07-22 :
   - **Partie cahier journal : DÉJÀ FAITE, ne pas la recoder.** `genererCahierJournal`
     (`src/lib/cahier-journal.ts`) + `actions/journal.ts` composent le journal en
     croisant chaque créneau EDT avec la progression de la semaine, TOUTES matières
     (`.eq('numero', semaine.numero)`, sans filtre de matière). Français par semaine,
     maths étalés sur les semaines de leur période à l'import (`repartirProgrammation`),
     donc tout est stocké par semaine et le journal se remplit.
   - **Partie "période complète" : RESTE à faire** = une vue montrant, pour une période
     entière, tout ce qui s'y travaille toutes matières confondues (aujourd'hui
     l'affichage est semaine par semaine).
   - **Décision en attente de Christophe (gate le code)** : maths stockés A) étalés sur
     les semaines (actuel) ou B) gardés au niveau période (bloc où l'on pioche). Il
     penche A (« période = compétences réparties sur les semaines »). Ne pas coder la
     vue période avant sa réponse.
3. **Plusieurs méthodes dès le setup** : aujourd'hui seul le français au setup, le reste
   s'ajoute dans Paramètres. Permettre de tout mettre dès la config.
4. **Nettoyage** : `remplirEnveloppes` (remplir l'EDT avec les items du manuel) est
   **obsolète** depuis la décision "EDT = grandes lignes, détail dans le cahier
   journal". À retirer proprement plutôt qu'à brancher.

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

- **2026-07-22 — Claude Code — migrations 014 + 015 APPLIQUÉES en prod** (projet
  `odwgkakeepcqbgpsfugl`, via le connecteur Supabase de Claude, feu vert de Christophe).
  Vérifié : fonction `remplacer_progression` créée, colonne `classes.zone_scolaire`
  (text + contrainte A/B/C) présente. La base est **vide** (0 classe), donc les périodes
  P1-P5 et le `periode_numero` des semaines se créeront à la première création de classe
  (rien à backfiller). Le blocage de Codex est donc levé : il peut committer/pousser sa
  branche `codex/audit-critical-fixes` et tester un vrai enregistrement IA + le recalage.
  Note accès Codex pour la suite : l'erreur "You do not have access to this project"
  venait d'un compte GitHub/Supabase qui n'est pas propriétaire du projet. Pour être
  autonome, Codex a besoin d'un `SUPABASE_ACCESS_TOKEN` généré depuis le COMPTE
  PROPRIÉTAIRE du projet (Supabase > Account > Access Tokens), puis `supabase link
  --project-ref odwgkakeepcqbgpsfugl` et `supabase db push`. Sinon, garder la division :
  Codex écrit les fichiers de migration, Claude les applique.
- **2026-07-22 - Codex - application Supabase bloquee** : Christophe a demande
  d'appliquer les migrations 014 et 015 sur le projet Supabase
  `odwgkakeepcqbgpsfugl`. Aucune migration n'a ete appliquee et aucune donnee de
  la base distante n'a ete modifiee. Voici exactement ce qui a ete tente :
  1. La commande globale `supabase` n'etait pas installee sur le PC.
  2. L'outil officiel a ete lance ponctuellement avec
     `npx.cmd --yes supabase`, version constatee `2.109.1`.
  3. Le projet local ne contient ni `supabase/config.toml`, ni
     `supabase/.temp/project-ref`. Le fichier `.env.local` contient seulement
     `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et
     `ANTHROPIC_API_KEY` : aucune cle d'administration, aucun mot de passe de
     base et aucun `SUPABASE_ACCESS_TOKEN`.
  4. `npx.cmd --yes supabase projects list` a echoue avec le message exact :
     `Access token not provided. Supply an access token by running supabase login
     or setting the SUPABASE_ACCESS_TOKEN environment variable.`
  5. Une connexion au tableau de bord Supabase a ensuite ete tentee via GitHub.
     L'authentification du compte `christopheMia` a reussi, mais l'editeur SQL du
     projet cible affiche le message exact : `You do not have access to this
     project`.
  6. Par securite, aucun SQL n'a ete execute avec la cle publique et aucune autre
     base n'a ete choisie par approximation.
  **Action demandee a Claude** : Claude ayant acces a Supabase, appliquer dans
  cet ordre `supabase/migrations/014_remplacement_progression_atomique.sql`, puis
  `supabase/migrations/015_calendrier_scolaire_zones.sql`. Verifier ensuite que
  la fonction `remplacer_progression` existe, que `classes.zone_scolaire` existe,
  que les classes existantes ont cinq lignes dans `periodes`, et que leurs
  semaines ont bien `periode_numero` renseigne. Ne pas annoncer la migration
  terminee avant ces controles.
- **2026-07-22 - Codex** : suite du chantier de Claude et audit de securite sur
  `codex/audit-critical-fixes`, non committe et non pousse. La chaine de migrations
  neuve est reparee (`appreciations` existe avant sa modification). Les creations
  de classe, la demonstration, l'EDT et le changement de manuel ne retirent plus
  l'ancienne version avant d'avoir prepare la nouvelle. La migration
  `014_remplacement_progression_atomique.sql` remplace les progressions dans une
  transaction PostgreSQL et synchronise aussi `semaines` lors d'une correction IA.
  Le planning annuel utilise `periodes` et `semaines.periode_numero` quand ils sont
  renseignes, avec un groupe explicite pour les semaines non rattachees et un repli
  compatible pour les anciennes classes. `TimetableGrid` suit maintenant la grille
  validee : largeur telephone, jours courts, fusion, couleurs et edition compacte.
  L'import IA est une seule porte : schema et prompt automatiques pour reconnaitre
  manuel, planning de periode ou programmation annuelle ; le choix de la periode
  n'apparait qu'apres detection. Zone A confirmee par Christophe. Le calendrier
  officiel metropolitain 2025-2026 et 2026-2027 est integre pour A, B et C. Le
  setup cree maintenant P1-P5, rattache les 36 semaines et saute les vacances.
  La zone reste modifiable dans les parametres. La migration
  `015_calendrier_scolaire_zones.sql` ajoute `classes.zone_scolaire`, cree les
  periodes des classes existantes et recale leurs semaines. L'aide a ete
  actualisee et tutoyee. Validation : 28 suites, 226 tests passes, type-check
  propre, build Next.js 16 de production reussi, `git diff --check` propre. Aucun
  fichier de `partage/` touche. RESTE : appliquer les migrations 014 et 015 sur
  la base cible avant de tester un vrai enregistrement IA et le recalage reel.
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
