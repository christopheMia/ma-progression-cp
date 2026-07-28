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
  manuel, chat de correction, bilan élève). Clé
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
8. **Christophe travaille sous Windows, avec `core.autocrlf=true`.** Les fichiers sont
   donc sur son disque en **CRLF**, alors qu'ils sont en LF côté Linux. Conséquence
   concrète, déjà vécue le 2026-07-26 : un test qui lisait le texte source d'un fichier
   et y cherchait `"rpc(\n        '...'"` passait sous Linux et **échouait chez lui pour
   toujours**, alors que le code était correct. Le test mesurait la plateforme, pas le
   code. Deux règles qui en découlent :
   - Si un test lit un fichier source, **normaliser les fins de ligne**
     (`.replace(/\r\n/g, '\n')`) avant toute comparaison.
   - Plus généralement, **éviter les tests qui vérifient du code en cherchant une chaîne
     exacte** avec indentation. Ils cassent au moindre reformatage. Préférer une regex
     tolérante aux espaces, ou mieux, tester le comportement.
9. **Vérifier la suite complète avant de rendre la main** : `npx jest` doit être à
   **zéro échec**. Un échec laissé derrière masque les vrais problèmes du suivant. Au
   2026-07-26 : 54 suites, 454 tests, tout vert.

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

- `src/app/(app)/setup/page.tsx` : assistant de configuration en 4 étapes. **Ordre
  changé le 2026-07-26** : 1 date de rentrée, 2 progressions, 3 élèves, 4 EDT. La date
  vient en premier parce que sans elle l'écran d'import ne peut afficher aucune date.
- `src/components/setup/` : `ProgressionsSetup`, `RentreeDatePicker`,
  `StudentListEditor`.
- `src/components/methodes/` : import progressif avec `SourceImporter`,
  `SourceContentPreview` et `BandeauCalage`.
- `src/lib/calage-semaines.ts` : **fonction pure** qui place les semaines rendues par
  l'IA sur les vraies dates de l'année. Réutilise obligatoirement la chaîne de dates de
  `setup-creation.ts` (`periodesOfficielles` puis `datesSemainesCalendaires`), sinon
  l'aperçu afficherait une date et l'application en enregistrerait une autre.
  `decalagePourDemarrerEn` traduit « ma progression démarre en semaine N » en décalage.
- `src/components/assistant/` : `AssistantFlottant` (bouton flottant déplaçable +
  panneau à deux onglets) et `ChatAssistant` (la conversation).
- `src/app/api/assistant/route.ts` : conversation libre, réponse en **texte**.
  À ne pas confondre avec `src/app/api/ia-chat/route.ts`, qui corrige une progression
  et rend une **sortie structurée**.
- `src/lib/position-flottante.ts` : fonction pure pour le bouton déplaçable (seuil
  clic/glissement, contrainte dans la fenêtre, relecture tolérante).
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

## 8. État courant / chantiers ouverts (au 2026-07-26)

### Fait et publié le 2026-07-26 sur `main`

Le commit fonctionnel **`7a389f6`**
(`7a389f693cf5c073412b3f31e1f8709938351bfd`) a été poussé sur
`origin/main`. Le push `31a935d..7a389f6` publie les corrections locales qui
étaient en attente, dont la suppression complète des résidus « Explorer le monde »
et la priorité commune du matin. Le déploiement Vercel de production
**`dpl_8sUiqvXBUnWg7WssSoTEgmW7ZmCg`** est prêt et correspond exactement à ce
commit. Le domaine `https://ma-progression-cp.vercel.app/` et l'URL directe du
déploiement répondent en HTTP 200.

Validation avant publication : **54 suites, 454 tests, zéro échec**, types propres,
`git diff --check` propre. Le dossier local non suivi `partage/` n'a pas été publié.

**Une seule base pour le local ET la production** : `odwgkakeepcqbgpsfugl`. Le
`npm run dev` de Christophe écrit dans la base que Cécile utilisera. Il n'y a pas
d'environnement de test séparé. La publication du 2026-07-26 n'a effectué aucune
remise à zéro, aucune écriture Supabase et aucune modification des données de classe
saisies par Christophe. Chantier possible, pas encore arbitré : séparer une base de test.

- **Calage des semaines à l'import** (le gros morceau). Un sommaire dont la première
  semaine de rentrée est vide décalait toute l'année, en silence. Deux destructions de
  données corrigées : `normalizeProgression` ne renumérote plus par position, et
  l'aperçu n'escamote plus les semaines sans contenu. Nouveau module pur
  `calage-semaines.ts`. L'écran **pose une question** (« ta progression démarre à
  quelle semaine ? ») au lieu d'offrir des boutons de décalage : reformulation exigée
  par Christophe, le mot « décalage » ne doit pas apparaître dans l'interface.
  Les semaines vides sont **affichées et datées** mais **pas enregistrées** : le trou
  dans la numérotation porte déjà l'information.
- **Nouveau champ `base_calage`** dans la sortie structurée de l'import (`numeros`,
  `dates` ou `ordre`) : l'écran doit être honnête sur son niveau de certitude. La route
  le force à `ordre` si les numéros rendus n'étaient pas exploitables.
- **Migration `017_supprimer_methode_orpheline` appliquée en prod.** Retirer le dernier
  document d'une méthode laissait la méthode derrière, vide. Double condition (aucun
  document ET aucune progression) pour ne jamais supprimer du contenu.
- **Progression d'exemple « questionner le monde » retirée.** Elle était posée d'office
  sur les 36 semaines de toute nouvelle classe par `genererSqueletteSemaines`. Vestige
  des débuts, jamais nettoyé. Les semaines partent maintenant vides.
- **L'assistant est devenu un vrai chat.** « Mon assistant » n'ouvrait qu'un formulaire
  d'import : aucun moyen de parler à l'IA. Panneau à deux onglets, conversation par
  défaut. Le bouton flottant est déplaçable à la souris et sa position est mémorisée.
  Une bulle d'accueil se présente au premier passage puis se tait pour de bon.
- **Import débloqué sur un document multi-périodes.** Christophe avait regroupé ses 5
  périodes dans un seul PDF : l'IA le classait « planning d'une période » sans pouvoir
  dire laquelle, et la validation exigeait un numéro de 1 à 5. Aucune réponse n'était
  vraie. Une option « Toutes les périodes » requalifie le document, et le prompt dit
  maintenant que « periode » ne vaut que pour UNE période nommable.
- **Avertissements situés.** Ils sont devenus structurés (`{ semaine, message }`) et
  s'affichent SUR la carte de la semaine concernée, juste au-dessus du champ à
  corriger. Le prompt exige de citer le libellé exact lu plutôt qu'un « certains mots
  sont peu lisibles » global. Attention : l'IA situe son doute sur le numéro du
  DOCUMENT, l'aperçu affiche les numéros décalés ; le report est fait dans
  `SourceImporter`, ne pas l'oublier si on touche à cette zone.

### Piège du 27/07, le plus coûteux à ce jour

- **Ne JAMAIS lever une erreur destinée à l'enseignant depuis une action serveur.**
  En production, Next.js **efface le texte** des erreurs levées dans une action
  serveur et ne renvoie qu'un `digest`. Le message soigné en français est perdu et
  l'utilisateur lit « An error occurred in the Server Components render. The specific
  message is omitted in production builds... ». En local le message passe, donc le
  bug est **invisible au développement** et **invisible aux tests unitaires** : il ne
  se voit qu'une fois déployé. Christophe s'est pris ce pavé en cliquant simplement
  « Ajouter ce critère » avec le champ vide.
  Règle : une action serveur **renvoie** son message, elle ne le lève pas. Utiliser
  `resultat()` et le type `Resultat<T>` de `src/lib/resultat.ts` :
  `{ ok: true, valeur }` ou `{ ok: false, message }`. Le composant lit `message`,
  il n'attrape plus d'exception. En plus, valider côté client ce qui peut l'être
  (un champ vide se dit sur place, sans aller-retour serveur).
  Vérification utile après un déploiement : `npx vercel logs <url-du-deploiement>`
  montre les erreurs d'exécution réelles, avec leur vrai message. C'est ce qui a
  permis de trouver la cause en une minute.

### Pièges rencontrés le 26/07, à ne pas refaire

- **`setPointerCapture` dès l'appui casse le clic.** En rendant le bouton flottant
  déplaçable, capturer le pointeur sur `pointerdown` redirige l'événement `click` vers
  le conteneur : le bouton ne le reçoit plus et plus rien ne s'ouvre. Ne capturer
  qu'une fois le glissement réellement engagé (au-delà du seuil).
- **Apostrophes.** `&apos;` rend une apostrophe DROITE (`'`), pas la typographique
  (`’`). Un test qui cherche `j’ai compris` ne trouve pas `j&apos;ai compris`. Le
  projet affiche du français soigné : écrire `’` directement dans le JSX.
- **`jest.useFakeTimers()` sans `afterEach`.** Un test qui échoue avant son
  `useRealTimers` laisse les faux minuteurs actifs et fait échouer les suivants pour
  une mauvaise raison. Toujours remettre les vrais minuteurs dans un `afterEach`.
- **`scrollIntoView` n'existe pas dans jsdom.** L'appeler en optionnel
  (`element?.scrollIntoView?.(...)`).

### Fait avant, EN LIGNE sur `main` (déployé)
- Bug de navigation du setup corrigé (données conservées entre allers-retours).
- Étape EDT = **choix** "grille vide" / "générer selon les quotas officiels"
  (`genererEdtCP`, arrêté 9/11/2015). Plus de trame figée imposée.
- Import IA à **une seule porte** (`IaImport.tsx` sur `main` +
  `schema-import-auto.ts`) : l'IA
  reconnaît seule manuel / planning de période / programmation annuelle ; le choix de
  la période n'apparaît qu'après détection. Fini les 3 radios.
- Grille d'édition (`TimetableGrid`) au **design validé** : fusion, couleurs par
  famille, largeur téléphone, jours courts.
- Calendrier officiel + zones A/B/C, périodes P1-P5, semaines calées (vacances
  sautées). Migrations **014 et 015 appliquées en prod et vérifiées**.

**RESTE À FAIRE** :

**Voir d'abord `docs/RETOURS-CHRISTOPHE-2026-07-26.md`** : la liste complète de ses
retours du 26/07 (règles métier, UI/UX, 3 bugs, 1 question), recopiée depuis son PDF.

**Les 3 bugs sont corrigés et publiés.** Le contraste sombre et le PDF de maths ont
été validés techniquement en local. Christophe n'a pas encore fait la validation
manuelle finale dans une session authentifiée de production. État exact :

- **3.3 contraste de l'EDT (`6661eda`)**. Cause trouvée : `src/app/globals.css`
  gardait le bloc `prefers-color-scheme: dark` du gabarit Next, qui repeint
  `--foreground` en `#ededed`. L'interface étant entièrement sur fonds blancs, un
  poste réglé en mode sombre affichait en quasi blanc **tout texte sans classe de
  couleur explicite**. `TimetableGrid` (édition) portait `text-slate-900` et restait
  lisible ; `EdtGrilleLecture` (lecture, EDT généré) n'en avait aucune, d'où « ça
  marche dans les paramètres mais pas ailleurs ». Correctif : bloc sombre supprimé,
  `color-scheme: light` déclaré (contrôles natifs), `text-slate-900` explicite sur le
  libellé de matière. Deux garde-fous : `src/app/__tests__/globals-contraste.test.ts`
  relit le CSS réel, plus un test de rendu. **Ne jamais recoller le bloc du gabarit.**
  Portée large : ce bug rendait pâle bien d'autres textes, pas seulement l'EDT.
  Validation locale réelle : préférence système sombre détectée, palette claire
  forcée, page de connexion lisible et CSS compilé sans règle sombre concurrente.
  Le composant de lecture seule et ses tests sont validés. Limite : la grille avec
  les données réelles n'a pas été ouverte, car elle exigeait une session existante.
- **3.1 maths en triple (`ac0a8f3`)**. Deux causes distinctes, sur les deux chemins
  d'import, corrigées ensemble :
  1. `normalizeProgression` (`src/lib/ia/schema.ts`) ne fusionnait pas les entrées de
     même `numero`. Les documents de maths donnent souvent une ligne par domaine pour
     la même semaine, l'IA rendait trois objets « semaine 1 ». La fusion concatène
     items, mots et pages sans répéter, et passe **avant** le plafond de 36 (sinon un
     document écrit sur trois lignes perdait les deux tiers de l'année).
  2. `repartirProgrammation` (`src/lib/repartition-periode.ts`) : deux blocs décrivant
     la même période repartaient chacun de la première semaine et s'empilaient. Les
     domaines sont regroupés par numéro de période avant répartition.
  Plus une règle de prompt : une seule entrée par numéro de semaine.
  Validation réelle avec
  `docsmethodes/programmation-maths-en-cp-acces-ecole.pdf` : l'appel Anthropic isolé
  a rendu `type_document=programmation`, `matiere=Mathématiques`, cinq périodes
  uniques de 1 à 5 et aucune pseudo-semaine. Aucun enregistrement applicatif ni aucune
  écriture Supabase n'a été effectué.
- **3.2 résidus « Explorer le monde » (`632302d`, complété par `7a389f6`)** :
  la progression automatique avait été retirée par `632302d`. Le commit publié
  `7a389f6` supprime aussi les composants, imports, constantes et faux contenus
  restants. Une vraie progression « Questionner le monde » saisie par l'utilisateur
  reste préservée et affichée par le chemin générique multi-matières.
- **Règle métier du matin (`7a389f6`)** : mathématiques, code et étude de la langue
  sont servis en priorité dans les créneaux du matin, avant les autres matières.
  La protection couvre le setup, les paramètres, l'import d'EDT, l'édition et la
  validation avant enregistrement. Une correction déterministe échange des séances
  complètes de même durée. Si cela n'est pas possible sans altérer une séance,
  l'enregistrement est bloqué avec un message compréhensible.

La question 4 est tranchée : la génération IA d'une journée est retirée du cahier
journal. L'UI/UX 2.1 à 2.3 reste ouverte. Le point 2.4 est traité par le suivi
par notion et critères d'observation. La règle métier du matin et le retrait des
résidus « Explorer le monde » ne sont plus des chantiers ouverts.

0. **Validation sur les vrais documents.** Le PDF de maths a été analysé réellement
   par Anthropic et confirme une programmation annuelle à cinq périodes sans doublon.
   Le calage réel du sommaire de français reste à confronter au document concerné.
1. **Import ciblé sur une semaine précise.** Demande de Christophe du 26/07, ni
   spécifiée ni commencée : pouvoir importer un document qui vient remplir UNE semaine
   restée vide. Aujourd'hui l'import prend un document entier et l'IA décide où ça
   tombe. C'est un chantier à part entière, à cadrer avant de coder.
2. **Le CUMUL**. Investigation Claude du 2026-07-22 :
   - **Partie cahier journal : DÉJÀ FAITE, ne pas la recoder.** `genererCahierJournal`
     (`src/lib/cahier-journal.ts`) + `actions/journal.ts` composent le journal en
     croisant chaque créneau EDT avec la progression de la semaine, TOUTES matières
     (`.eq('numero', semaine.numero)`, sans filtre de matière). Français par semaine,
     maths étalés sur les semaines de leur période à l'import (`repartirProgrammation`),
     donc tout est stocké par semaine et le journal se remplit.
   - **Partie "période complète" : FAITE ET DÉPLOYÉE (option A, lecture)**. Page
     `/periodes` (`src/app/(app)/periodes/page.tsx`) + fonction pure `agregerParPeriode`
     (`src/lib/vue-periode.ts`, 5 tests). Pour chaque période, toutes matières ensemble
     (période d'abord), sans doublon. Lien "📅 Vue par période" dans l'en-tête du
     planning. Maths confirmés en **A** par Christophe (étalés sur les semaines).
   - **RESTE possible (option B, si demandé)** : rendre la vue période **éditable**
     directement (cliquer une notion et la changer). Subtilité à cadrer : une période =
     assemblage de semaines, donc il faut décider sur quelle semaine l'édition s'écrit.
     Christophe a dit "on commence par A", B reporté.
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

Ajouter en HAUT de cette liste, format : `AAAA-MM-JJ - [assistant] - résumé`.
(Traits d'union simples : la convention 1 bannit le tiret cadratin, et cette ligne
en prescrivait un. Les anciennes entrées ci-dessous en gardent, on ne réécrit pas
l'historique.)

- **2026-07-27 (soir) - Claude - ÉTAPE 1 FAITE ET EN LIGNE : le suivi est passé à quatre niveaux.**
  Commit **`b88b3da`**, poussé sur `origin/main`, déploiement Vercel de production prêt
  et vérifié (le domaine répond et redirige vers `/connexion`). Christophe a donné son
  feu vert après avoir précisé que les données de suivi actuelles sont des tests.
  **61 suites, 507 tests, zéro échec. Types propres. Build de production réussi.**

  **Nouveau module `src/lib/niveaux.ts`** (6 tests) : l'échelle du LSU, une seule fois
  pour toute l'application. `NIVEAUX` (dans l'ordre), `ABREVIATION_NIVEAU`
  (NA / PA / A / D), `LIBELLE_NIVEAU`, `estAcquis`, `niveauDepuisAcquis`, `estNiveau`.
  `estAcquis` dit exactement la même chose que le trigger SQL de la migration 019
  (`niveau in ('atteint','depasse')`) : si les deux divergeaient, l'écran et le livret
  ne compteraient pas pareil.

  **Les deux actions serveur sont renommées et écrivent le niveau** :
  `toggleAcquisition` devient **`definirNiveauNotion`**, `definirAcquisitionCritere`
  devient **`definirNiveauCritere`**. « Toggle » ne voulait plus rien dire sur quatre
  valeurs. Au passage, `definirNiveauNotion` **renvoie** son message d'erreur au lieu de
  le lever : c'était la dernière action du suivi à encore lever, donc le dernier endroit
  où l'enseignant aurait pu relire le pavé « An error occurred in the Server Components
  render ». Les deux écrivent `niveau` ET `acquis` : le trigger recalculerait `acquis`
  de toute façon, l'écrire garde la ligne juste si le trigger disparaissait un jour.

  **`BoutonsAcquisition` devient `BoutonsNiveau`** : un vrai `role="radiogroup"` de
  quatre `role="radio"`, avec les flèches du clavier (test à l'appui) et un seul bouton
  atteignable à la tabulation. Une famille de couleurs à part du violet de
  l'application : rouge, ambre, émeraude, bleu. Un composant `LegendeNiveaux` pose la
  légende une fois en haut du bloc.

  **`vue-classe.ts` agrège sur quatre niveaux** : `CaseSuivi` gagne un compteur
  `enCours` (les partiellement atteints), et « aucun » exige maintenant que **rien** ne
  soit engagé. Un enfant partiellement atteint partout se lit en orange (« en cours »)
  et plus en rouge. C'est le vrai gain du passage à quatre niveaux, et le binaire le
  rangeait avec les échecs.

  **Deux endroits lisaient encore `valeur === true`**, ils comptaient donc zéro sur des
  niveaux : la préparation du bilan IA et l'export Word. Corrigés. L'export Word rend
  désormais l'abréviation (NA / PA / A / D) au lieu de « ✓ / Non acquis » ; son option
  s'appelle `niveaux` et plus `acquis`. Pour la route IA, « partiellement atteint » part
  avec ce qui reste à travailler : la route ne connaît que deux paquets, et c'est ce
  qu'un enseignant veut lire.

  **Relecture de l'ancien format** : une ligne écrite avant la migration 019 n'a pas de
  `niveau`. L'écran la relit par l'ancien booléen (`niveauDepuisAcquis`) au lieu de
  l'afficher vierge. Un test le vérifie avec une ligne sans `niveau`.

  **Reste à valider à l'oeil par Christophe** (il regarde demain) : les quatre pastilles
  tiennent-elles sur une ligne sur son téléphone, les couleurs se lisent-elles, et
  « Ma classe d'un coup d'oeil » raconte-t-elle la bonne chose sur quatre niveaux.

  **La suite, dans l'ordre** : 2) les deux corrections de `/programme` (pas de
  rechargement complet, et « appliquer aux notions semblables ») plus la table
  `competences_perso` ; 3) le bilan par élève et par période, avec les commentaires par
  matière et leurs boutons de copie.

- **2026-07-28 - Claude - LE TEXTE DÉCOULE DU POSITIONNEMENT. C'est la mécanique du bilan.**
  Question de Christophe : « est-ce que le texte rédigé prendra bien en compte les notes
  de positionnement ? », puis « c'est un peu la base, si une compétence n'est pas
  atteinte ça doit forcément se fier à ça ». Il avait raison de vérifier : dans la
  maquette, les briques étaient des **données de démonstration figées**, sans aucun lien
  avec les niveaux. C'est maintenant câblé, et c'est LA règle du chantier.

  **Le niveau posé décide de la brique, de son rôle et de sa formulation** :

  | Niveau | Rôle dans la phrase | Formulation |
  |---|---|---|
  | dépassé | réussite | la formule d'éclat, ou la réussite à défaut |
  | atteint | réussite | « lit à voix haute un texte préparé avec une belle fluidité » |
  | partiellement atteint | **progrès** | « commence à lire à voix haute un texte préparé » |
  | non atteint | vigilance | « la lecture à voix haute reste difficile », **toujours** suivie de sa prochaine étape |
  | rien de positionné | aucune brique | on n'écrit pas sur ce qu'on n'a pas observé |

  Les quatre niveaux produisent **quatre textes différents**. « Partiellement atteint »
  et « non atteint » ne se lisent pas pareil pour une famille : le premier dit un enfant
  en chemin, le second une difficulté, et seule la difficulté porte une suite (règle 2).

  **Conséquence de conception, à ne pas rater** : chaque compétence doit porter
  **quatre formulations lisibles par un parent**, une par niveau (`eclat`, `reussite`,
  `encours`, `vigilance` plus `suite`). Le libellé officiel ne peut PAS servir : il est
  écrit pour l'institution, et la règle 1 interdit qu'il atterrisse dans le livret.
  C'est exactement la **« programmation simplifiée »** repérée chez LivrEval le 27/07.
  **Il faut donc écrire ces formulations pour les 101 compétences officielles**, une
  fois pour toutes, et les compétences ajoutées à la main auront leurs champs à remplir.
  C'est un vrai morceau de contenu, à prévoir dans l'étape 2 ou juste après.

  **Les retouches sont gardées par élément ET par rôle** (`edits[cle|role]`). Sans le
  rôle dans la clé, une phrase de réussite corrigée à la main se retrouverait posée sur
  une difficulté après un changement de niveau. Chaque brique affiche aussi en gris de
  quel élément du programme elle vient, pour pouvoir remonter du texte à sa source.

  **Ce qui n'est PAS automatique, volontairement** : changer un niveau met à jour la
  liste des briques, mais **ne réécrit pas** le texte déjà rédigé. L'enseignante relit
  et reclique « Rédiger » si elle veut. On n'efface jamais son travail sans le lui
  demander.

  **LES COMMENTAIRES DE LA SEMAINE ALIMENTENT LE BILAN DE PÉRIODE.** Précision de
  Christophe le 28/07 : « chaque commentaire ajouté doit venir se greffer et alimenter
  le LSU numérique ». Le champ « Bilan et commentaire de la semaine » de
  `StudentTracking` (table `appreciations`, une ligne par élève, semaine et matière)
  existe déjà et se remplit chaque semaine. Ces commentaires **remontent dans le bilan
  de la période comme des briques**, rangées dans leur matière et étiquetées de leur
  semaine (« ton mot de la semaine 9 »). L'enseignante ne réécrit rien : elle décoche ce
  qui ne mérite pas d'aller dans le livret. C'est ce qui rend le bilan de période
  presque écrit d'avance, et c'est l'angle différenciant repéré le 27/07 (les
  concurrents font taper les appréciations à la main).
  Requête à écrire : les `appreciations` des semaines de la période, par élève et par
  matière, converties en briques dans une fonction pure et testable.

  **LES COMPÉTENCES AJOUTÉES À LA MAIN SUIVENT LA MÊME RÈGLE.** Demande de Christophe
  le 28/07 : « faudra que ça puisse prendre en compte aussi les compétences ajoutées
  manuellement ». Une compétence perso porte donc **exactement les mêmes champs** qu'une
  compétence officielle : `eclat` (facultatif), `reussite`, `encours`, `vigilance` et
  `suite`. C'est ce qui lui permet d'écrire dans le livret comme les autres, **sans
  aucun traitement particulier nulle part dans le code** : la fonction qui transforme un
  niveau en brique ne sait pas d'où vient la compétence, et n'a pas à le savoir.
  L'écran 3 de la maquette demande donc ces formulations au moment de la création, avec
  chaque champ étiqueté de la couleur de son niveau. Seule la phrase de « non atteint »
  impose sa prochaine étape. Vérifié dans la maquette : la compétence perso
  « Participer au cercle de contes du vendredi » écrit bien dans l'appréciation de Lina
  (atteint) et de Tom (partiellement, puis non atteint), avec la mention « ajoutée par
  toi » dans le tableau.
  Conséquence pour la table `competences_perso` de l'étape 2 : prévoir ces cinq colonnes
  de texte dès la migration, pas seulement le libellé.

  **Les contours des zones modifiables doivent se voir** (même message) : une bordure
  quasi invisible laissait croire à du texte figé. Les briques et la zone
  d'appréciation portent maintenant une vraie bordure au repos
  (`--violet-ligne: #c3b5ea`), qui se renforce au survol et au focus. Règle générale :
  dans cet écran, **ce qui se modifie doit se voir comme un champ sans avoir à le
  survoler pour le découvrir**.

- **2026-07-27 (soir) - Claude - le bilan se copie PAR MATIÈRE, à l'unité ou par paquet.**
  Demande de Christophe en reprenant le chantier : « le bilan de commentaires doit être
  copiable par matière avec un bouton », puis « on doit pouvoir éditer les bilans
  copiables avec toutes les matières d'un coup ou à l'unité, il faut trouver un système
  de sélection ».

  **Pourquoi c'est structurant** : le livret officiel demande un commentaire
  « Acquisitions, progrès et difficultés éventuelles » **par matière**, pas un seul pour
  l'élève. La maquette n'avait qu'une appréciation globale : c'était faux par rapport au
  document à remplir. Le bilan est maintenant **un bloc par matière**.

  **Ce qui est décidé et déjà dans la maquette**
  (`docs/maquettes/suivi-4-niveaux-et-bilan-lsu.html`, écran 2) :
  - Un bloc par matière, chacun avec **ses** briques, **son** bouton « Rédiger »,
    **son** texte modifiable et **son** bouton « Copier <matière> ». Rien n'oblige à
    tout traiter d'un coup : Cécile peut faire le français, coller, revenir plus tard.
  - **Le système de sélection est la case du titre du bloc.** Elle ne sert qu'à la
    copie groupée. Le bouton du bas énonce ce qu'il va faire (« Copier les 2 matières
    cochées », « Copier Français », « Rien à copier » quand tout est décoché), et une
    case « Toutes les matières » coche ou décoche tout. Une matière décochée s'estompe
    mais reste lisible et modifiable : décocher, c'est exclure de la copie, jamais
    désactiver la saisie.
  - Le texte copié d'une matière contient ses **éléments cochés avec leur
    positionnement**, puis le commentaire : de quoi remplir les deux cases du livret
    pour cette matière.
  - **Les briques portent donc une matière.** Chaque brique est rangée dans la matière
    où elle sera lue. Conséquence pour le code : la clé de stockage d'une appréciation
    est `(eleve, periode, matiere)`, pas `(eleve, periode)`.

  **Deux corrections du modèle de formulation**, trouvées en le faisant tourner sur les
  quatre élèves de démonstration :
  1. **Le pronom était figé sur « Elle »**, donc faux pour un garçon. L'élève porte un
     genre et le pronom en découle. À prévoir en base pour de vrai.
  2. **Un progrès sans sujet** rendait « A bien progressé en lecture », télégraphique.
     Règle retenue : la posture, les réussites, les progrès et les briques libres
     parlent de l'enfant et prennent un sujet (le prénom la première fois, le pronom
     ensuite) ; **la vigilance garde sa tournure impersonnelle** parce qu'elle parle de
     la difficulté et pas de l'enfant (« la lecture à voix haute reste difficile ;
     un temps de lecture quotidien à la maison l'aiderait beaucoup »).

  **Autre retour du même moment** : dans la colonne Positionnement, les quatre
  abréviations doivent tenir **sur une seule ligne**. Repliées sur deux lignes,
  l'échelle NA vers D ne se lit plus comme une échelle. `flex-wrap: nowrap` sur le
  groupe et `flex: 0 0 auto` sur les boutons.

  La maquette se vérifie sans navigateur : `jsdom` est déjà dans le repo, un petit
  script Node charge le fichier avec `runScripts: 'dangerously'` et lit le DOM produit.
  C'est ce qui a permis de voir les deux fautes de formulation ci-dessus.

- **2026-07-27 - Claude - CHANTIER LSU cadré et démarré. Lire cette entrée avant de coder.**
  Longue session de conception avec Christophe. Tout est décidé, la base est migrée,
  il reste les écrans.

  **Décisions de Christophe, définitives** :
  1. **Le suivi passe à QUATRE niveaux** (NA / PA / A / D), au lieu du binaire
     acquis / non acquis. Plus aucune règle de conversion à inventer pour le livret.
  2. **Niveaux abrégés** NA / PA / A / D partout, avec une légende sous le tableau.
  3. **Le choix de l'élève est un menu déroulant** (`<select>` natif), pas une grille
     de cartes : plus discret, et le sélecteur plein écran du téléphone est gratuit.
     L'état du bilan est écrit dans chaque ligne du menu, avec un compteur à côté
     (« 8 bilans commencés sur 23 ») et des flèches élève précédent / suivant.
  4. **Pas de PDF** pour l'instant. Uniquement « Copier le bilan », Cécile colle
     dans le LSU officiel.
  5. **Rattachement notion vers compétence : MANUEL**, avec une aide déterministe
     (comparaison de mots), **pas d'IA**. Raison donnée par Christophe : économiser
     le budget de la clé Anthropic, et un rattachement ne change pas d'une année sur
     l'autre.
  6. **Base = programme officiel**, plus la possibilité d'ajouter ses propres
     compétences, rattachées à la matière et au domaine voulus.
  7. **Positionnement par domaine par défaut**, par élément en option (le LSU
     propose les deux, « par domaine » est le réglage courant du métier).

  **Maquette validée et INTERACTIVE**, gardée dans le dépôt :
  **`docs/maquettes/suivi-4-niveaux-et-bilan-lsu.html`** (ouvrir dans un navigateur).
  Miroir publié : `https://claude.ai/code/artifact/62dc016f-cf78-4e50-8a12-da225036699a`.
  Les niveaux se cliquent, l'élève et la période se changent, l'appréciation
  s'assemble. C'est la référence visuelle du chantier, s'y tenir.

  **L'APPRÉCIATION S'ASSEMBLE À PARTIR DE BRIQUES** (demande de Christophe) :
  la période produit une liste de briques, chacune **décochable et modifiable sur
  place**, et l'enseignant enlève ce qu'il ne veut pas dire AVANT de rédiger.
  Chaque brique porte un rôle. **Modèle de formulation en cinq temps, dans cet
  ordre** : `posture`, `réussite` (regroupées en une phrase), `progrès`,
  `vigilance` (toujours suivie de sa prochaine étape, séparée par un point-virgule),
  `encouragement`. Les briques libres (les mots de l'enseignant) passent juste avant
  l'encouragement.
  **Trois règles non négociables pour que ça sonne humain** :
  1. **Jamais un code de niveau ni un libellé technique de compétence** dans le
     texte final. « Identifier des mots · Atteint » devient « lit maintenant avec
     assurance les mots contenant les sons étudiés ». Un parent doit comprendre.
  2. **Une difficulté ne s'énonce jamais seule**, toujours avec ce qu'on va faire.
  3. **Ne jamais inventer une observation** que l'enseignant n'a pas faite : l'IA
     reformule les briques, elle n'en ajoute pas.
  **RGPD (convention 5)** : le prénom ne part pas vers l'IA. Envoyer les briques avec
  un marqueur et réinsérer le prénom côté navigateur, comme les autres routes.
  La maquette fait l'assemblage avec une simple fonction, sans IA, pour juger le
  modèle : garder cette fonction pure et testable, l'IA ne fait que fluidifier ensuite.

  **FAIT : migration `019_suivi_quatre_niveaux` APPLIQUÉE** sur `odwgkakeepcqbgpsfugl`.
  Colonne `niveau` sur `acquisitions` et `acquisitions_criteres`, contrainte sur les
  4 valeurs, et un **trigger** qui garde l'ancienne colonne `acquis` juste
  (`acquis = niveau in ('atteint','depasse')`). Donc tout le code qui lit encore
  `acquis` (export Word, bilan IA, confettis) continue de marcher sans modification.
  Les tables étaient quasi vides (1 ligne), la migration était sans risque.

  **DÉCOUVERTES IMPORTANTES, à ne pas re-chercher** :
  - **L'écran de rattachement EXISTE DÉJÀ** : page `/programme`
    (`src/app/(app)/programme/page.tsx` + `components/programme/NotionLigne.tsx` +
    `lib/actions/mapping.ts`). Menu déroulant des 101 compétences par notion,
    `rattacherNotionManuel` pour le manuel, `proposerRattachements` pour l'IA.
    Elle n'a jamais servi : `notion_competence` est **vide**. **Ne pas la recoder.**
    Deux défauts à corriger : elle fait `window.location.reload()` à chaque
    rattachement (insupportable sur 36 semaines), et il manque un « appliquer aux
    notions semblables » (les 14 « Lire … » se rattachent une par une).
  - **`src/lib/lsu-bareme.ts` existe** (barème note vers niveau, règle de Christophe,
    /3 ou /4, « dépassé » à 100 %). Il n'a **aucun test** et n'est **importé nulle
    part**. Seul fichier de logique métier du projet sans test.
  - Il existe aussi une page `/competences`.

  **Le modèle LSU, vérifié sur `partage/exemple lsu.pdf`** (4 pages, scan sans texte ;
  le convertir en images avec PyMuPDF pour le relire) : trois colonnes, **Domaines
  d'enseignement | Principaux éléments du programme travaillés durant la période |
  Positionnement** (Non atteints / Partiellement atteints / Atteints / Dépassés).
  **Le positionnement porte sur l'ÉLÉMENT, pas sur le domaine.** L'élément est une
  **phrase libre** écrite par l'enseignant, pas une compétence officielle imposée :
  c'est ce qui rend l'ajout manuel de compétences natif et non exceptionnel.
  Attention, cet exemple vient d'une classe de cycle 3, seule la structure vaut.

  **Comment les concurrents font (recherche du 27/07)** :
  - L'intégration LSU n'est **pas une API**, c'est un **fichier XML** que l'enseignant
    dépose à la main (menu « Échanges de données » puis « Import », réglage
    « Import(s) Éditeur(s) »). Les bilans importés sont **verrouillés**, réimport
    possible tant qu'un parent n'a pas signé.
  - Trois identifiants obligatoires : **code UAI** de l'école, **identifiant technique
    ONDE de la classe** (chaque rentrée), **INE de chaque élève**. Extraits d'ONDE :
    Listes & Documents, Extractions, Ensemble des élèves de l'école, CSV avec les
    colonnes « INE » et « Identifiant classe ». LivrEval a **essayé** d'automatiser
    l'import de ce CSV et **a renoncé** (homonymes, orthographes, structures).
  - **Edumoov suit directement en NA/PA/A/D** et calcule automatiquement le
    positionnement depuis les évaluations, avec surcharge manuelle. LivrEval calcule
    « en fonction du système de notation et du **seuil de validation** paramétré », et
    **« Dépassés » s'attribue toujours à la main**.
  - LivrEval propose une **« programmation simplifiée »**, réécriture lisible des
    libellés officiels « souvent très techniques » pour les parents. Bonne idée à
    reprendre.
  - **Ce qu'ils ne font pas : les appréciations sont tapées à la main.** C'est l'angle
    différenciant, cohérent avec l'IA qui lit déjà le manuel.
  - **Le schéma XML lui-même n'a PAS été trouvé** (ni XSD ni noms de balises).
    Probablement dans l'espace éditeurs du ministère. **Ne pas bricoler un XML au
    jugé** : un fichier accepté avec de mauvaises données atterrit dans le livret
    officiel d'un enfant. Deux pistes : demander la doc éditeur, ou obtenir un vrai
    fichier produit par un autre outil pour en déduire la structure.

  **ORDRE DE CONSTRUCTION** :
  1. **Le suivi à 4 niveaux** : base déjà migrée, il reste l'écran. Remplacer
     `BoutonsAcquisition` dans `StudentTracking.tsx` par un `role="radiogroup"` de
     4 boutons abrégés, adapter `toggleAcquisition` / `definirAcquisitionCritere`
     pour écrire `niveau`, et `vue-classe.ts` pour agréger sur 4 niveaux.
  2. **Les deux corrections de `/programme`** (pas de rechargement, et appliquer aux
     notions semblables), plus les compétences ajoutées à la main
     (table `competences_perso`, par classe, fusionnée à la lecture).
  3. **Le bilan par élève et par période** (nouvelle page) et « Copier le bilan ».

  **Autre chose vue au passage** : la jauge IA n'a pas disparu, elle est dans le
  panneau « Mes outils » de l'accueil. Les 5 routes IA enregistrent bien leur usage,
  donc elle ne rate rien ; ce qui la rend approximative, c'est le tarif Sonnet écrit
  en dur, le taux de change fixé à 0,92, et le mot « mots » employé pour des tokens.

- **2026-07-27 - Claude - vue d'ensemble de la classe, cliquable élève par élève**.
  Demande de Christophe : « on n'a pas la vue simplifiée cliquable de tous les élèves ».
  Elle avait été spécifiée le matin mais pas codée, faute d'une décision de sa part.
  Décisions prises : pastille **couleur ET fraction**, et **dépliage sur place** plutôt
  qu'une page par élève.
  Nouvelle section « 👀 Ma classe d'un coup d'œil » en haut du suivi : les élèves en
  lignes, les notions en colonnes, une case colorée par croisement avec le compte des
  points acquis. Le clic sur un élève déplie son détail sous sa ligne, en lecture seule,
  et renvoie vers le détail par notion pour modifier.
  Le calcul est une **fonction pure** `agregerClasse` dans `src/lib/vue-classe.ts`
  (9 tests), sur le modèle de `vue-periode.ts`. Aucune migration : tout est déjà stocké
  par élève et par critère. Une notion sans critère compte pour elle-même via le suivi
  global, sinon l'enseignant qui n'a créé aucun critère verrait un tableau tout gris.
  Piège respecté : **aucun attribut `title` ajouté sur une notion**, le test des notions
  longues utilise `getByTitle` et casserait avec deux éléments. Les en-têtes de colonnes
  sont donc tronqués en CSS, et le titre complet reste lisible dans le dépliage.
  Validation : 60 suites, 493 tests, tsc propre, build de prod réussi.
  Suite possible, pas faite : faire de cette vue la vue par défaut et reléguer le détail
  par notion au troisième niveau. Voir `docs/SPEC-suivi-eleves-vues.md`.

- **2026-07-27 - Claude - la notion est nommée à l'écran dans le bloc des critères**.
  Retour de Christophe en voyant la page : « on ne voit pas ce qui est ajouté au final
  et à quoi ». Cause : la notion n'était nommée que dans un `<label className="sr-only">`
  et dans un `aria-label`. Accessible à un lecteur d'écran, invisible à l'oeil. On
  tapait un critère sans savoir à quelle notion il se rattachait.
  Correctif, validé par Christophe avant d'être codé (convention 3) : le bloc s'intitule
  « Mes critères d'observation pour : » suivi de la notion en violet, le nombre de
  critères déjà posés est affiché, et l'étiquette du champ de saisie devient visible.
  Détail à ne pas casser : **ne pas ajouter d'attribut `title` sur la notion dans ce
  bloc**. Le test des notions longues utilise `getByTitle`, qui échoue s'il trouve deux
  éléments. Le titre complet reste accessible par le bouton « Voir le titre complet ».
  L'`aria-label` du champ a été retiré, devenu redondant avec le vrai `<label>`.
  Validation : 59 suites, 482 tests, tsc propre, build de prod réussi.
  **Chantier ouvert derrière ce retour** : voir `docs/SPEC-suivi-eleves-vues.md`.

- **2026-07-27 - Claude - correction du piège des erreurs d'action serveur**.
  Christophe a ouvert la fiche de semaine juste après la publication et a cliqué
  « Ajouter ce critère » avec le champ vide. Il a reçu le pavé « An error occurred in
  the Server Components render... » au lieu de « Écris le critère que tu veux
  observer. ». Cause trouvée dans `npx vercel logs` en une minute : Next.js efface le
  texte des erreurs levées dans une action serveur, en production seulement.
  Portée réelle : la quinzaine de messages en français des critères d'observation ET
  de l'édition du cahier journal étaient tous invisibles pour l'enseignant.
  Correctif : nouveau module `src/lib/resultat.ts` (type `Resultat<T>` et helper
  `resultat()`), toutes les actions de `criteres-observation.ts` et `journal.ts`
  renvoient désormais `{ ok, valeur }` ou `{ ok, message }`, et les deux composants
  lisent `message` au lieu d'attraper une exception. Garde-fou client en plus : un
  libellé vide est refusé sur place, sans aller-retour serveur, à l'ajout comme à la
  modification. Détail complet dans la section « Piège du 27/07 » plus haut.
  Validation : **59 suites, 481 tests** (dont 2 tests de non-régression sur ce bug
  précis et 5 sur `resultat`), tsc propre, build de prod réussi.

- **2026-07-27 - Claude - reprise du relais Codex : migration 018 appliquée et travail publié**.
  Codex avait été coupé une deuxième fois, exactement comme le 22/07 : tout son travail
  du 26/07 (cahier journal modifiable, suivi par critères d'observation, horaires sans
  secondes) était **non committé**, dans son worktree `.codex/worktrees/74eb/ma-progression-cp`.
  Récupéré intégralement, committé sur la branche `codex/criteres-observation`
  (commit `43ef0ec`), puis rapatrié dans le dépôt principal.
  Vérifié chez Christophe avant publication : **58 suites, 474 tests, zéro échec**,
  `./node_modules/.bin/tsc --noEmit` propre et **build de prod Next.js 16 réussi**
  (20 routes, `api/ia-journal` bien absente). Piège rencontré : le premier type-check
  échouait sur `.next/dev/types/validator.ts`, un fichier **généré** par un ancien
  `npm run dev` qui référençait encore la route supprimée. Ce n'est pas une erreur de
  code ; il faut vider `.next` après avoir supprimé une route, sinon le build de prod
  s'arrête sur un fantôme.
  **Migration `018_criteres_observation` APPLIQUÉE** sur `odwgkakeepcqbgpsfugl` via le
  connecteur Supabase de Claude. Vérifié en base après coup : 2 tables créées, RLS
  active sur les 2, 2 policies, les 2 index de rattachement, grants présents pour
  `authenticated` et **zéro grant pour `anon`**. Aucune donnée existante touchée
  (1 classe, 23 élèves, 36 semaines, 154 lignes de progression, 90 créneaux d'EDT
  intacts). Christophe a donné son accord explicite avant l'application, en sachant
  que local et production partagent la même base.
  Fusionné dans `main` en avance rapide, poussé, déploiement Vercel contrôlé.
  `partage/` est resté hors Git.

- **2026-07-26 - Codex - cahier journal modifiable et suivi par critères, local uniquement**.
  Le cahier journal permet maintenant de modifier les horaires, la matière et le
  déroulement d'une entrée, ou de supprimer uniquement cette entrée après confirmation.
  Le contenu complet est validé côté serveur avant enregistrement. Le bouton
  « Générer la journée », la route `api/ia-journal`, son prompt, son texte d'aide et
  son test orphelin ont été retirés. Les horaires sont affichés sans secondes dans
  le cahier journal, son export Word, l'EDT en lecture et la grille EDT modifiable.
  Le suivi des élèves est désormais présenté par notion dans des cartes pleine largeur.
  Un titre long occupe au plus deux lignes par défaut et reste dépliable. L'enseignant
  peut ajouter, renommer et supprimer ses critères d'observation, puis choisir Acquis
  ou Non acquis pour chaque élève et chaque critère. Les acquisitions historiques
  restent intactes et visibles comme suivi de la notion dans son ensemble. La migration
  additive `018_criteres_observation.sql` crée `criteres_observation` et
  `acquisitions_criteres` avec RLS, sans modifier `acquisitions`; elle est aussi
  reproduite dans la source de vérité 006. Les policies ciblent explicitement
  `authenticated`, les grants Data API sont explicites et les colonnes de rattachement
  ont leurs index. Elle n'a été appliquée à aucune base distante.
  Validation : 58 suites, 474 tests, typage TypeScript, `git diff --check`, contrôle des
  ajouts U+2014 et build Next.js 16 avec webpack, tous réussis. Le contrôle navigateur
  a atteint la page de connexion locale, mais pas la fiche d'une semaine faute de
  session authentifiée dans ce navigateur. Aucun fichier source n'a été committé ni
  poussé et aucune publication n'a été faite. La production affiche donc encore
  l'ancienne interface et les horaires avec secondes tant qu'une publication séparée
  n'est pas autorisée.
  **Reprise publication** : Christophe a ensuite autorisé explicitement la migration,
  le commit et la publication. Codex s'est arrêté avant le commit car son connecteur
  Supabase retourne zéro projet, et le poste ne fournit ni `SUPABASE_ACCESS_TOKEN` ni
  mot de passe de base. Aucun SQL distant, commit, push ou déploiement supplémentaire
  n'a donc été effectué. Pour reprendre sans casser la production : appliquer d'abord
  `018_criteres_observation.sql` au projet `odwgkakeepcqbgpsfugl`, vérifier les deux
  tables, leurs RLS, policies, grants et index, puis seulement créer le commit, intégrer
  `main`, pousser et contrôler le déploiement Vercel. Le dépôt principal est propre à
  l'exception de `partage/`, local et hors Git, qui ne doit jamais être ajouté.

- **2026-07-26 - Codex - publication des corrections sur `main` et en production**.
  Le commit fonctionnel `7a389f6`
  (`7a389f693cf5c073412b3f31e1f8709938351bfd`) regroupe la suppression complète
  des résidus « Explorer le monde » et la priorité commune du matin pour
  mathématiques, code et étude de la langue. Il a été intégré à `main`, puis poussé
  vers `origin/main` avec tous les commits locaux en attente depuis `31a935d`.
  Le déploiement Vercel de production `dpl_8sUiqvXBUnWg7WssSoTEgmW7ZmCg` est prêt,
  correspond au commit complet ci-dessus et sert
  `https://ma-progression-cp.vercel.app/` en HTTP 200. Validation avant publication :
  54 suites, 454 tests verts, type-check et `git diff --check` propres. Le dossier
  local non suivi `partage/` est resté hors du commit. Aucune remise à zéro, aucune
  écriture Supabase et aucune modification des données de classe de Christophe.
  La présente mise à jour de passation est publiée dans un second commit documentaire.

- **2026-07-26 - Codex - priorité commune des matières imposées le matin**.
  Décision explicite de Christophe appliquée sans remise à zéro et sans écriture
  distante. Nouveau moteur pur `src/lib/edt-matin.ts` : mathématiques, code et étude
  de la langue sont reconnus par des règles explicites, puis servis en priorité dans
  les créneaux du matin. Une correction déterministe échange uniquement des séances
  complètes de même durée, avec toutes leurs données et leur mise en forme. Si la
  correction imposerait de découper ou de modifier la durée d'un cours, l'enregistrement
  est bloqué avant toute écriture avec un message indiquant la matière et la durée du
  créneau du matin nécessaire. Les routines ne sont jamais déplacées.
  `genererEdtCP` applique désormais cette priorité aux trois matières, tout en gardant
  les quotas et le code quotidien. La même validation couvre la création depuis le
  setup, la génération et le rechargement depuis les paramètres, l'import IA d'EDT,
  l'édition dans `TimetableGrid`, la Server Action de remplacement et le mode
  démonstration. L'import et l'éditeur signalent une correction automatique ou un
  blocage compréhensible. Tests comportementaux ajoutés pour les trois familles, le
  débordement après-midi, la trame type, l'import, l'édition et le setup.
  Validation finale : 54 suites et 454 tests verts, type-check propre,
  `git diff --check` propre et aucun tiret cadratin dans les fichiers du chantier.
  Aucune donnée de classe de Christophe n'a été lue, modifiée ou supprimée. Aucun
  reset n'a été effectué. Travail ensuite publié dans le commit `7a389f6` sur
  `origin/main` et déployé en production.

- **2026-07-26 - Codex - suppression complete des residus Explorer le monde**.
  Decision explicite de Christophe appliquee. `EdmBlock` et l'ancienne constante
  `EDM_PROGRESSION_CP` ont ete supprimes avec leurs imports. `WeekCard`, la fiche
  semaine, l'accueil et l'aide n'affichent plus les champs historiques `edm_theme`
  et `edm_competences`. Ces colonnes restent vides et presentes dans le type car le
  schema actuel les impose encore. Une semaine sans contenu ne recoit plus le faux
  libelle « Revisions » sur l'accueil ou la carte du cahier journal. Une progression
  Questionner le monde vraiment enregistree continue de passer par le chemin
  multi-matieres et son libelle canonique. Le mode demonstration emploie maintenant
  le nom officiel « Questionner le monde ». Tests ajoutes sur les semaines vides, les
  anciens champs et les vraies donnees QLM. Validation : 53 suites et 425 tests verts,
  type-check propre, `git diff --check` propre. Travail ensuite publié dans le commit
  `7a389f6` sur `origin/main` et déployé en production.
  Controle en lecture seule ajoute sur la regle « mathematiques, code et etude de la
  langue uniquement le matin ». Violation confirmee, non corrigee dans ce chantier :
  `genererEdtCP(true)` garantit seulement le code a 08:45. Son algorithme general
  place aussi l'etude de la langue l'apres-midi lundi, jeudi et vendredi, ainsi que
  les mathematiques lundi et jeudi. Les tests existants disent explicitement que seul
  le code reste garanti le matin. L'import PDF, l'edition manuelle et
  `updateEmploiDuTemps` ne valident aucune contrainte matinale, puis le cahier journal
  recopie les horaires sans les corriger. Ce point demande un correctif separe.
  Cette violation a ensuite été corrigée dans le même commit publié `7a389f6`, avec
  une contrainte commune aux trois matières sur tous les chemins concernés.

- **2026-07-26 - Claude Code - calage des semaines a l'import**. Un sommaire dont la
  premiere semaine de la rentree est vide decalait toute l'annee, en silence. Deux
  pertes de donnees corrigees : `normalizeProgression` ne renumerote plus par position
  (`schema.ts`), et l'apercu n'escamote plus les semaines sans contenu. Nouveau module
  pur `src/lib/calage-semaines.ts` qui place les semaines sur les vraies dates en
  reutilisant la chaine de `setup-creation.ts`, donc l'apercu ne peut pas mentir.
  La date de rentree passe en etape 1 du setup et va jusqu'au prompt. Nouveau
  `BandeauCalage.tsx` qui **pose une question** (« ta progression demarre a quelle
  semaine ? ») au lieu d'offrir des boutons de decalage : reformulation demandee par
  Christophe, la notion de decalage disparait de l'ecran. Les semaines vides sont
  affichees et datees, avec la mention qu'elles pourront etre remplies plus tard ;
  elles ne sont pas enregistrees, le trou dans la numerotation porte l'information.
  Au passage : la progression d'exemple « questionner le monde » n'est plus imposee a
  la creation d'une classe. 393 tests, 392 verts, build prod OK.
  Spec : `docs/superpowers/specs/2026-07-26-calage-semaines-import-design.md`.
  Plan : `docs/superpowers/plans/2026-07-26-calage-semaines-import.md`.
  Fait dans la meme session, apres le calage :
  - **Migration 017 appliquee en prod** : `retirer_source_progression` supprime la
    methode devenue orpheline. Une methode « Maths en CP » etait restee vide chez
    Christophe apres suppression de sa source, sans aucun ecran pour l'enlever.
  - **« Questionner le monde » retire** de `genererSqueletteSemaines`. C'etait une
    progression d'exemple des debuts, posee d'office sur les 36 semaines de toute
    nouvelle classe. Les 36 lignes de sa base ont aussi ete nettoyees.
  - **L'assistant est devenu un vrai chat** : le bouton « Mon assistant » n'ouvrait
    qu'un formulaire d'import, il etait « bloque en analyse de documents » (ses mots).
    Nouvelle route `/api/assistant` en texte libre, panneau a deux onglets, bouton
    flottant deplacable a la souris avec position memorisee.
  - **Dernier echec de la suite corrige** : le test « la Server Action passe par le RPC »
    cherchait `"rpc(\n        '...'"` dans le texte source. Avec `core.autocrlf=true`
    sous Windows, le fichier est en CRLF : le test echouait chez Christophe alors que le
    code etait correct, et passait chez Codex sous Linux. Voir la convention 8, section 3.
  Suite complete : **49 suites, 405 tests, zero echec**. 13 commits locaux, non pousses.

- **2026-07-26 - Claude Code - recuperation, validation et fusion de l'import progressif**.
  Codex avait ete coupe en plein milieu du chantier "import progressif", travail
  NON committe dans son worktree (`.codex/visualizations/2026/07/22/.../ma-progression-cp-import-progressif`,
  branche `codex/import-progressif-setup`). Aucune perte : tout a ete committe sur sa
  branche pour le mettre a l'abri, puis valide chez Christophe (44 suites / 367 tests
  verts, type-check propre, build prod Next.js 16 reussi ; l'echec de build cote Codex
  ne venait que des polices Google bloquees par son reseau). Verification de la base :
  migrations 014 et 015 deja appliquees, `remplacer_progression(uuid,uuid,text,integer[],jsonb,boolean)`
  present et compatible. **Migration `016_methode_sources` appliquee en prod** (projet
  `odwgkakeepcqbgpsfugl`) : table `methode_sources` + RLS + RPC `enregistrer_source_progression`
  et `retirer_source_progression`, purement additif, aucune donnee touchee. Message du
  commit reecrit proprement, puis **fusion fast-forward dans `main`** (commit `5cecca2`),
  en local uniquement, rien pousse sur GitHub. RESTE : pousser quand Christophe le demande,
  tester le nouveau flux d'import en vrai dans l'app.

- **2026-07-23 - Codex - gestion persistante des sources dans les parametres**.
  Ajout de `methode-sources.ts` et des Server Actions
  `ajouterSourceProgression` et `retirerSourceProgression`. Elles reconstruisent
  toutes les sources persistantes avec validation runtime, materialisent la
  progression complete selon les vraies semaines de periode et passent uniquement
  par les RPC atomiques de la migration 016. Les snapshots de concurrence sont des
  copies de tous les identifiants courants, cible incluse au retrait. Les conflits de
  nom de methode, doublons, sources obsoletes et erreurs de concurrence produisent des
  messages explicites. Une methode creee pour un premier import en echec est supprimee
  seulement si elle est encore vide; aucune methode existante ou non vide ne l est.
  Les caches des parametres, du planning, des periodes, de l accueil et des semaines
  concernees sont revalides apres succes.
  La page Parametres charge les sources dans l ordre de creation uniquement quand des
  methodes existent. `MethodesEditor` liste chaque fichier, son type et sa periode,
  ouvre `SourceImporter` avec la matiere et la methode pre-remplies, confirme le
  retrait et conserve le suivi des acquis et les liaisons EDT. Une classe sans methode
  ouvre directement l importeur. L ancien bloc `Tout regenerer`, `MANUELS`,
  `ManuelEditor`, `ManualSelector` et `IaImport` ont ete retires apres verification
  de leurs references. L assistant flottant utilise maintenant le meme importeur et
  la nouvelle action, sans ecriture directe dans `progression`. Les anciennes actions
  `progression-matiere` et `progression-periode` restent uniquement parce que les tests
  de remplacement atomique couvrent encore leur securite; aucun composant runtime ne les
  importe.
  TDD rouge observe avant les modules serveur puis avant les interfaces. Validation
  finale : 44 suites et 367 tests verts, type-check propre, controle de diff et U+2014
  propres. Le build de production reste non valide dans cet environnement : il a
  echoue uniquement parce que les onze polices Google ne pouvaient pas etre
  telechargees, puis la relance reseau a ete refusee par la limite d usage. La
  migration 016 reste ecrite mais non appliquee a une base distante. `partage/` est
  intact. Non committe.

- **2026-07-23 - Codex - dedoublonnage des acquisitions par eleve**.
  La requete du planning selectionne aussi `acquisitions.eleve_id`, rendu obligatoire
  dans `AcquisitionPlanning`. Apres l intersection avec les methodes actives et les
  items courants, le numerateur est dedoublonne par tuple exact
  `[eleve_id, codeMatiereCanonique(matiere), grapheme]`. La cle utilise
  `JSON.stringify` pour eviter les collisions possibles avec une concatenation et un
  separateur present dans les donnees. Ainsi, le meme eleve avec `Lecture` puis
  `francais` sur la meme notion compte une fois, tandis que deux eleves distincts
  comptent deux fois. Les doublons d items dans la progression restent un seul item
  par eleve au denominateur. Les tests et mocks portent explicitement `eleve_id` :
  aucune valeur artificielle n est ajoutee dans le code de production. TDD rouge
  observe sur le doublon d alias et le champ absent de la requete, puis vert.
  Validation finale : 39 suites et 351 tests verts, type-check propre. Controle de
  diff et U+2014 propres, aucun changement RPC, `partage/` intact. Non committe.

- **2026-07-23 - Codex - avancement exact du planning par methode suivie**.
  `/planning` charge maintenant `methodes.suivi_actif` et, parmi les acquisitions
  acquises, `semaine_id`, `matiere` et `grapheme`. Le modele pur annuel marque chaque
  contenu avec son etat de suivi et calcule lui-meme le numerateur et le denominateur.
  Il construit l ensemble exact des items actuellement materialises pour les seules
  methodes actives. Le denominateur vaut ces items uniques multiplies par le nombre
  d eleves. Le numerateur compte une fois chaque ligne d acquisition retournee dont la
  semaine, la matiere canonisee et l item strictement identique appartiennent a cet
  ensemble. Les acquisitions obsoletes, les variantes de texte et les methodes
  inactives sont exclues. Les contenus des methodes inactives restent affiches.
  `WeekCard` consomme ce resultat commun et borne seulement la largeur visuelle a 100 %.
  TDD rouge observe sur l ancien comptage global, puis tests verts pour methode inactive,
  melange actif et inactif, doublon de notion, acquisitions reelles multiples,
  acquisition obsolete, progression remplacee et zero item actif. Validation finale :
  39 suites et 350 tests verts, type-check propre. Aucun changement RPC. Controle de
  diff et U+2014 propres, `partage/` intact. Non committe.

- **2026-07-23 - Codex - planning multi-matieres et codes canoniques relies**.
  La page `/planning` lit maintenant `progression` et `methodes`, puis passe par le
  modele pur `construirePlanningAnnuel`. Les contenus sont groupes par semaine et par
  matiere, avec le vrai nom importe de chaque methode. `AnnualGrid` et `WeekCard`
  conservent les periodes, les liens, l etat temporel et l avancement des acquisitions,
  mais n utilisent plus `semaines.graphemes`. Une classe sans methode garde ses 36
  semaines et affiche une explication claire. Ajout de `matieres.ts`, source unique
  des codes persistants, fondee sur `familleMatiere` : francais, maths, qlm, eps, arts,
  anglais, emc, routine et slug stable pour une matiere personnalisee. La creation
  canonise seulement des copies des sources, detecte les conflits entre alias,
  enregistre les codes canoniques dans `methodes` et le RPC de progression, puis relie
  chaque creneau de cours a son `methode_id`; les routines et matieres sans methode
  restent a null. Le cahier journal et la page semaine partagent le meme rapprochement
  canonique. Aucun DML direct ni changement du contrat RPC. TDD rouge observe sur les
  modules absents, les anciens graphemes et les liens EDT manquants. Les tests couvrent
  creation vers planning francais et maths, zero methode, creation vers EDT lie puis
  journal, alias, accents, casse, matiere inconnue et non-mutation. Validation finale :
  39 suites et 347 tests verts, type-check propre. Controle de diff et U+2014 propres.
  Non committe.

- **2026-07-23 - Codex - creation atomique depuis toutes les sources du setup**.
  `creerClasse` accepte maintenant `sourcesProgression`, sans ancien
  `manuelId/customProgression`. Avec ou sans source, la classe recoit toujours les 36
  semaines de `genererSqueletteSemaines`, recalees par le calendrier officiel. La
  colonne `classes.manuel_id` vaut `custom` avec une source et `sans-methode` sinon.
  Les groupes sont crees dans l ordre, via `ensureMethode` avec le nom importe. Deux
  noms de methode pour la meme matiere sont refuses avant toute ecriture, conformement
  a la contrainte unique actuelle. Les sources de chaque groupe sont triees sur
  `creeLe`, sans mutation, puis enregistrees sequentiellement par le seul RPC
  `enregistrer_source_progression`. Chaque appel recoit le snapshot courant des UUID,
  le niveau de precision, le contenu structure et les lignes produites par
  `materialiserSources` avec les vraies semaines de chaque periode. Aucun DML direct
  ne vise `methode_sources` ou `progression`. En cas d echec, la nouvelle classe et ses
  dependances sont supprimees; l ancienne classe n est retiree qu apres les eleves, les
  periodes, les semaines, les sources, les progressions et l EDT. La page n utilise
  plus de cast transitoire. Elle affiche une alerte claire et reactive l interface si
  la Server Action echoue; `redirect` reste hors du `try/catch`, selon Next.js 16.
  TDD rouge constate sur l orchestrateur absent, puis tests du calendrier et des noms
  accessibles ajustes aux contrats reels. Validation ciblee : 7 suites et 90 tests
  verts. Suite complete : 36 suites et 325 tests verts avec
  `npm.cmd test -- --runInBand`. Type-check, controle de diff et U+2014 propres.
  La migration 016 reste seulement ecrite, non appliquee a une base distante. Non
  committe.

- **2026-07-23 - Codex - premiere etape du setup en import progressif**. Ajout de
  `ProgressionsSetup`, branche sur le vrai `SourceImporter` et utilise a la place de
  `ManualSelector` dans `setup/page.tsx`. L enseignante peut continuer sans source,
  importer plusieurs documents sans quitter l etape, revenir en arriere sans perdre
  ses brouillons, retirer une source et continuer explicitement avec tout le classeur.
  Les sources sont regroupees par matiere et methode, avec leur nombre, leur fichier,
  leur type et leur periode eventuelle. Un doublon est bloque seulement dans la meme
  methode, car l empreinte pedagogique ne contient ni matiere ni nom de methode. Une
  note explique qu un planning de periode plus precis remplace uniquement la partie
  concernee du sommaire general. Direction visuelle : classeur enseignant avec tranche
  violette, cartes simples sans tableau, largeurs contraintes pour 375 px, boutons
  nommes, focus existant de `Bouton` et mouvements reduits. `ManualSelector` est
  conserve car `ManuelEditor` l utilise encore. La page stocke les sources dans le
  brouillon du wizard; leur raccord persistant est decrit dans l entree ci-dessus.
  TDD rouge constate
  sur le composant absent, puis second rouge sur la portee des doublons. Validation :
  3 suites ciblees et 60 tests verts avec
  `npm.cmd test -- --runInBand src/components/setup/__tests__/ProgressionsSetup.test.tsx src/components/methodes/__tests__/SourceImporter.test.tsx src/lib/__tests__/progression-sources.test.ts`.
  Type-check, controle de diff et U+2014 propres. Non committe.

- **2026-07-23 - Codex - import progressif d une source de progression**. Ajout de
  `SourceImporter` et `SourceContentPreview` dans `src/components/methodes/`.
  Apres revue de specification, l apercu permet aussi de construire explicitement
  une structure absente : ajout de semaines 1 a 36, de periodes P1 a P5 sans doublon
  et de plusieurs domaines par periode. Un changement entre format hebdomadaire et
  programmation affiche une confirmation de restructuration, tout en conservant les
  deux brouillons en memoire pour restaurer les saisies lors d un retour au type initial.
  La source finale ne garde que la structure coherente avec le type valide.
  L import accepte un texte ou plusieurs PDF, avec 10 fichiers et 25 Mio au maximum.
  Jusqu a 4 Mo au total, les PDF sont envoyes bruts dans un `FormData`; au-dela, leur
  texte est extrait sequentiellement dans le navigateur puis concatene avec un separateur.
  Les lectures PDF liberent chaque page et le document, meme en cas d erreur. L indice de
  matiere reste facultatif et aucun
  prenom n est envoye a la route. Apres l analyse, la matiere, la methode, le type et
  la periode eventuelle sont corrigibles. Une faible confiance ou un avertissement
  produit un encart ambre. Les erreurs et confirmations utilisent respectivement
  `role="alert"` et `role="status"`. L apercu edite les semaines et les domaines sans
  muter les props, avec une notion complete par ligne. Les programmations gardent leurs
  periodes brutes, sans appel a `previsualiserProgrammation` ni
  `getPeriodesDisponibles`. Les saisies sont conservees brutes pendant la frappe, y
  compris les espaces saisis caractere par caractere avec `userEvent`, puis nettoyees
  uniquement lors de la validation finale. Celle-ci construit l union
  `SourceProgression`, calcule une empreinte du seul contenu pedagogique effectif avant
  `onSourceReady`, et bloque les doubles validations. Une validation reussie fige
  definitivement l ecran sur `Document pret`. Les requetes utilisent `AbortController` :
  annuler ou demonter le composant interrompt la requete et ignore toute reponse tardive.
  Direction visuelle appliquee sans redesign global : palette existante, cartes
  mobiles et trois intercalaires `Document`, `Verification`, `Ajouter`, avec focus
  visible et reduction des mouvements. Ajout de la dependance de test
  `@testing-library/user-event`. Tests rouges observes avant les implementations et les
  corrections de qualite. Apres implementation, 5 suites ciblees et 72 tests sont verts.
  `npx.cmd tsc --noEmit` est propre. Commande reproduite :
  `npm.cmd test -- --runInBand src/components/methodes/__tests__/SourceContentPreview.test.tsx src/components/methodes/__tests__/SourceImporter.test.tsx src/lib/__tests__/progression-sources.test.ts src/lib/__tests__/import-auto.test.ts src/lib/ia/__tests__/pdf-client.test.ts`.
  `git diff --check` et
  controle U+2014 propres. `IaImport.tsx` et `partage/` sont restes intacts. Non committe.

- **2026-07-23 - Codex - materialisation pure des sources de progression**. Ajout de
  `materialiserSources` et `ResultatMaterialisation` dans
  `src/lib/progression-sources.ts`. Les sources manuelles gardent leurs numeros globaux,
  les programmations passent par `repartirProgrammation` avec les vraies semaines de la
  classe, et les sources de periode sont recalees sans debordement vers la periode
  suivante. Les numeros locaux invalides d une source de periode sont ignores avant le
  recalage, tout en gardant leur rang initial pour ne pas decaler les lignes suivantes.
  Les blocs de programmation avec le meme numero de periode sont regroupes avant leur
  repartition, dans l ordre des domaines et notions fournis, avec un avertissement.
  La priorite est manuel, programmation, periode, puis `creeLe` ancien vers recent et
  `clientId` binaire. `creeLe` est un ISO requis, issu de `methode_sources.created_at`,
  mais n entre pas dans l empreinte de contenu. Les lignes vides n ecrasent jamais une
  ligne existante, les numeros hors 1 a 36 sont avertis, les sorties sont triees et les
  entrees restent immuables. Ajout de `genererSqueletteSemaines`, base de 36 semaines
  sans methode,
  utilisee ensuite par `genererProgression` sans changement de son contrat public.
  Tests rouges observes avant implementation, puis 54 tests dedies verts, type-check et
  `git diff --check` propres. Non committe.

- **2026-07-23 - Codex - sources persistantes et operations atomiques**. Ajout de
  `methode_sources` avec contraintes coherentes selon le type de document, contenu JSON
  structure, unicite par methode et empreinte, RLS et policy de lecture proprietaire.
  Les ecritures directes sont revoquees pour les roles applicatifs. Les fonctions
  PostgreSQL `enregistrer_source_progression` et `retirer_source_progression` sont
  `security definer` avec un `search_path` vide, controlent strictement le proprietaire,
  verrouillent la methode et refusent un snapshot de sources obsolete avant toute
  mutation. Elles ajoutent ou retirent ensuite une source puis recalculent toute la
  progression dans la meme transaction. Le setup futur devra appeler ces RPC
  sequentiellement, jamais ecrire directement dans la table. La reconstruction autonome
  006 reproduit ce schema apres la definition complete de 014. `MethodeSource` est une
  union discriminee. Deux cycles rouges ont ete observes, d'abord sur la migration
  absente, puis sur les exigences de concurrence et de securite. Les 14 tests dedies,
  les 17 tests de sources partages et le type-check passent. Migration ecrite seulement,
  non appliquee a une base et non validee par un moteur PostgreSQL local. Non committe.
- **2026-07-23 - Codex - detection enrichie de l'import IA**. Le schema automatique
  renvoie maintenant la matiere, le nom de methode, le type, la periode, la confiance
  et les avertissements. Le prompt detecte ces informations sans imposer le francais,
  traite la matiere recue comme un simple indice corrigible et ne demande aucun prenom
  d'eleve. La route normalise les metadonnees et garde toujours les deux tableaux de
  sortie, vides quand ils ne concernent pas le type de document. Tests rouges puis verts,
  type-check et controle U+2014 propres. Non committe.
- **2026-07-23 - Codex - sources de progression importees**. Ajout de
  `src/lib/progression-sources.ts` et de ses 17 tests : regroupement par matiere et
  methode normalisees (apostrophes, ligatures et tirets inclus), ordre conserve,
  priorite periode/programmation/manuel, blocage des empreintes identiques et
  empreinte SHA-256 canonicalisee avec un ordre binaire stable. La source est une union discriminee avec
  validation runtime pour la frontiere IA. Tests dedies et type-check propres.
  Non committe.
- **2026-07-23 - Codex - reprise apres la coupure de Claude, boutons unifies
  termines et publication demandee**. Les modifications non journalisees de
  Claude ont ete retrouvees et conservees. La liste "RESTE A MIGRER" de l'entree
  suivante est maintenant remplacee par ce bilan :
  1. Les actions du setup, des editeurs Eleves/Manuel/Methodes, de l'import IA,
     du cahier journal, du suivi des eleves et de la grille EDT utilisent
     maintenant `src/components/ui/Bouton.tsx`.
  2. Les controles structurels restent volontairement des boutons HTML compacts :
     ouverture/fermeture, suppression d'une pastille eleve, choix des cartes de
     base EDT, etoiles et statuts du suivi, outils internes de mise en forme EDT.
     Ils ne doivent pas prendre l'apparence d'un bouton d'action principal.
  3. `Bouton` utilise maintenant `type="button"` par defaut pour eviter une
     soumission accidentelle dans un formulaire, signale l'etat de chargement
     avec `aria-busy` et masque le reflet anime hors de ses bords.
  4. Les emojis ont ete retires des nouveaux libelles de boutons et remplaces par
     des icones Lucide quand elles apportent une information utile.
  5. La page temporaire `/demo-boutons` est conservee, non liee dans la navigation,
     jusqu'a la validation visuelle finale de Christophe. Elle pourra ensuite etre
     supprimee.
  6. Controle visuel effectue sur `/connexion` en ordinateur et en mobile 390 px :
     aucun debordement horizontal, aucune erreur navigateur. Validation technique :
     29 suites, 231 tests passes, type-check propre, build Next.js 16 de production
     reussi, `git diff --check` propre. Le premier build isole avait seulement
     echoue faute d'acces reseau aux Google Fonts, puis a reussi avec cet acces.
  7. `partage/` est reste local et n'a pas ete ajoute a Git. La branche
     `feat/accueil-icones-lucide` partait exactement de `main`. Publication
     effectuee : commit `9745683`, integration en avance rapide dans `main`, puis
     push GitHub. L'integration GitHub/Vercel n'a pas declenche automatiquement
     de build, donc la meme version a ete deployee directement avec l'outil Vercel
     officiel. Deploiement production `dpl_DRCJBuHTYgeyjnAs58iLqZ4wPa7D` marque
     `READY`, domaine officiel `https://ma-progression-cp.vercel.app` verifie en
     HTTP 200 avec la nouvelle interface.
- **2026-07-23 - Claude Code - système de boutons unifié (`<Bouton>`) + effets de
  survol** (branche `feat/accueil-icones-lucide`, PAS poussée, en cours). Christophe
  veut une interface pro et design, cohérente partout.
  1. **Cartes de l'accueil** : effet de survol valide = surelevation (effet A) + barre
     d'accent violette qui glisse en haut (effet B). Factorise dans la classe CSS
     `.carte-i` (globals.css, via `::before`, avec garde `prefers-reduced-motion`).
     Applique a toutes les cartes de l'accueil (page.tsx + OutilsIaSection +
     CahierJournalCard).
  2. **Composant `<Bouton>` unique** : `src/components/ui/Bouton.tsx`. UNE source de
     verite pour forme/etats/mouvement. Variantes : `principal` (degrade violet + reflet
     qui balaie, 1/ecran), `secondaire` (violet plein), `contour` (violet outline),
     `neutre` (gris outline), `fantome` (texte), `danger` (rouge). Tailles sm/md/lg.
     Etats loading (spinner Loader2) + disabled + focus-visible ring a11y. Passer `href`
     rend un `<Link>` Next. IMPORTANT frontiere serveur/client : depuis un composant
     SERVEUR (ex accueil), NE PAS passer `icon={Icone}` (fonction non serialisable),
     passer l'icone en `children` a la place. En composant client, `icon=` marche.
  3. **Header** : emojis `☰`/`✕` du menu mobile -> icones lucide `Menu`/`X`, focus rings
     ajoutes, CTA aligne. LogoutButton : icone `LogOut` + spinner.
  4. **Boutons migres vers `<Bouton>` (FAIT)** : accueil "Configurer", ResetButton,
     GenererEdtButton, RealignerSemainesButton, ResetBlockButton, ResetContenuButton,
     ProposerRattachementsButton, PrintButton, GoogleDocsButton, ImporterEdtButton
     (le label d'upload reste un `<label>`). Emojis retires des labels PrintButton /
     ResetBlockButton chez les appelants (parametres/periodes/planning/semaine).
  Vérifs : `tsc` propre, `npm run build` OK a chaque vague.
  **RESTE A MIGRER (boutons d'action seulement, PAS les controles structurels comme les
  cases d'EDT, en-tetes depliables, bouton assistant flottant)** : setup/page.tsx, les
  editeurs de parametres (ElevesEditor, ManuelEditor, MethodesEditor, NomMethodeEditor,
  PrenomEnseignantEditor, RentreeEditor), semaine (CahierJournalEditor, StudentTracking),
  ProgressionCorrector, setup/* (IaImport, ManualSelector, RentreeDatePicker,
  StudentListEditor), EdtExplicationModal, BudgetIaIndicator, planning/page.tsx, les pages
  auth (connexion/inscription). Page de DEMO `src/app/(app)/demo-boutons/page.tsx` A
  SUPPRIMER une fois le style definitivement valide. Rien encore commite/pousse.
- **2026-07-23 - Claude Code - page d'accueil : emojis remplacés par des icônes
  lucide-react** (branche `feat/accueil-icones-lucide`, PAS encore poussée, en attente
  du feu vert de Christophe). Christophe veut une interface pro et design : plus aucun
  emoji sur l'accueil. Convertis dans `src/app/(app)/accueil/page.tsx`,
  `src/components/accueil/OutilsIaSection.tsx` et `.../CahierJournalCard.tsx` :
  📖✏️/📚✏️ → `BookOpenText`+`Pencil`, 👋 → `Hand`, ✨ → `Sparkles`, 🌍 → `Globe`,
  📅 → `CalendarDays`, 🕐 → `Clock`, ➕ → `Plus`, 🧭 → `Compass`, 🧰 → `Wrench`,
  📔 → `NotebookPen`, 📋 → `ClipboardList`, 📚 → `BookOpen`, 🎯 → `Target`,
  🧩 → `Puzzle` ; les flèches `→` et triangles `▴▾` passent en `ArrowRight` /
  `ChevronUp`-`ChevronDown`. Détail technique : `OutilsIaSection` est un composant
  CLIENT, la page un composant SERVEUR ; on ne peut pas passer un composant React en
  prop à travers la frontière, donc la prop `emoji: string` est devenue `icon:
  keyof ICONES` (un NOM d'icone serialisable) resolu via une petite table `ICONES`
  dans le composant client. Vérifs : `tsc --noEmit` propre, `npm run build` (Next.js 16)
  réussi, 0 emoji restant sur l'accueil. RESTE : feu vert de Christophe pour commit +
  push, et éventuellement étendre la même conversion aux autres pages si elles en ont.
- **2026-07-22 — Claude Code — vue "période complète" (A) déployée** : page `/periodes`
  + `src/lib/vue-periode.ts` (`agregerParPeriode`, 5 tests) + lien dans l'en-tête du
  planning. Lecture seule (option A choisie par Christophe). Poussé sur `main`. Option B
  (édition directe dans la vue période) reportée. C'est le pendant "période d'abord" de
  `/programme`. Le cumul du cahier journal était déjà en place (voir plus bas).
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
