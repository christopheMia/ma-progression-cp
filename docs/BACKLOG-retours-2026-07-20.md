# Reprise & backlog Ma Progression CP (20/07/2026)

Document de REPRISE : état du projet + liste des choses à faire (problèmes à régler
+ exemples à prendre en compte). Point d'entrée unique pour continuer.

Source des retours : `partage/probleme a régler.docx` (Christophe). Consigne :
« structure au mieux pour avancer, je ne serai pas là pour essayer mais il faut
avancer au maximum ». Docs d'exemple ajoutés pour les périodes : `partage/exemple
de planning p1.pdf` (Période 1 = 7 semaines × 4 jours, séances détaillées),
`partage/edt.pdf`.

Statut : [ ] à faire · [~] en cours · [x] fait.

## 0. État du projet au 20/07 (fait & déployé)

Branche `feat/methodes-par-matiere`. Preview la plus récente :
`https://ma-progression-5hod6gbbk-christophemias-projects.vercel.app`.

Déjà livré et déployé :
- Générateur d'EDT depuis le **volume horaire officiel** CP (`src/lib/edt-generator.ts`).
- **Couleurs** (fond + texte) + **gras/italique/souligné** par case de l'EDT, +
  bouton 🖌️ pour propager un style à toute une matière (`TimetableGrid.tsx`).
- Fix des boutons « remettre à zéro » ; **périodes P1-P5** (migration 010) + bouton
  « caler sur le calendrier » (`src/lib/calendrier-semaines.ts`).
- **Programme officiel détaillé** : français 49 + maths 24 compétences en base
  (référentiel `competences_officielles`), page `/competences`. Sources :
  `docs/references/attendus-cp-francais-detaille.txt`, `...-maths-detaille.txt`.
- Écran **« Programme couvert »** `/programme` : mapping IA notion↔compétence par
  période (`src/lib/actions/mapping.ts`) + édition manuelle + trous du programme.
- Barème LSU `src/lib/lsu-bareme.ts` (note d'éval → niveau).

Migrations prod appliquées : 010 (periodes), 011 (couleur_texte), 012 (mise en
forme), 013 (notion_competence).

Specs (dans `docs/superpowers/specs/`) :
- `2026-07-19-programme-officiel-lsu-design.md`
- `2026-07-19-emploi-du-temps-genere-design.md`
- `2026-07-20-mapping-notion-competence-design.md`
- `2026-07-20-livret-lsu-design.md` (Phase 3, **option B validée** : saisir la note
  d'éval → conversion barème → coche le niveau → modifiable).

Chantier EN COURS = **livret LSU (Phase 3)** : reste table `bilan_lsu`, écran de
saisie des notes/niveaux par élève et période, export PDF au format officiel (cf.
`partage/exemple lsu.pdf`), récupération des commentaires du suivi
(`appreciations.commentaire`). Barème (règle Christophe) : diviser l'échelle par 3
(sans « dépassé ») ou par 4 (avec), « dépassé » possible seulement si 100 %.

## 1. UI / UX & Navigation

- [x] **Mise en forme des cases EDT trop lourde** : masquer les contrôles (couleurs,
  B/i/U) derrière un **petit crayon cliquable** à côté du nom de la matière, qui
  déroule le menu de mise en page. (Rendre discret ce qui a été ajouté le 20/07.)
  → FAIT : `TimetableGrid.tsx`, état `styleOuvert` (une seule case ouverte à la fois).
- [x] **Accueil : cartes "Paramètres" et "Aide" inutiles** (déjà dans le header) →
  les retirer, remplacer par une **bulle explicative au survol**.
  → FAIT : retirées de l'accueil, `title=` explicatif sur chaque entrée de `HeaderNav.tsx`.
- [x] **Planning de la semaine** : ajouter un **accès déroulant à l'emploi du temps**
  pour vérifier avant de générer le cahier journal.
  → FAIT : `EdtApercu.tsx` (lecture seule) dans une `CollapsibleSection` repliée par défaut.
- [x] **Carte "Ajoute tes matières"** : la mettre à la **même taille** que les autres
  cartes. → FAIT : intégrée à la grille régulière `sm:grid-cols-3`.
- [x] **Carte "Mes outils IA"** : la rendre **cliquable et dépliable**.
  → FAIT : `OutilsIaSection.tsx`, état mémorisé en `localStorage`.
- [x] **Nouvelle carte "Cahier journal en cours"** : accès rapide au cahier de la
  semaine actuelle (identifiée par date/numéro) ; le menu doit aussi permettre de
  consulter/gérer les cahiers des **semaines à venir**.
  → FAIT : `CahierJournalCard.tsx`, dépliant sur les 5 semaines suivantes.
- [x] **"Mes méthodes et progression"** : au clic, arriver **directement au bon
  endroit** de la page (ancre `#methodes`). → FAIT : `id="methodes"` sur la Section.
- [x] **Nouvelle carte "Emploi du temps"** sur l'accueil (accès rapide).
  → FAIT : carte vers `/parametres#edt` (ancre `id="edt"` ajoutée).
- [x] **Bouton "Mon assistant"** toujours visible : ouvre le chat + l'import.
  → FAIT : `assistant/AssistantFlottant.tsx` monté dans le layout applicatif,
  donc présent sur tous les écrans. Réutilise `IaImport` (import PDF/texte + chat).
- [x] **Carte "Configuration initiale"** sur l'accueil (option importante).
  → FAIT : carte vers `/setup`, désormais visible en permanence.

## 2. Fonctionnalités IA & Importation

- [x] **L'IA ne lit pas les PDF** (seulement le texte collé dans le chat). Besoin
  d'un **outil IA centralisé, toujours accessible**, capable d'**importer des
  plannings PDF** et de **modifier ceux en cours**.
  → FAIT : bouton « Mon assistant » partout + import PDF + chat de correction.
- [x] **Lecture fidèle des tableaux PDF** : les programmes téléchargés sont souvent
  des tableaux PDF ; l'outil doit les lire précisément et **copier exactement** le
  contenu. (cf. `exemple de planning p1.pdf` : tableau Semaine × Jour × séances.)
  → FAIT. **Cause racine** : `pdf-client.ts` concaténait les fragments pdf.js avec
  `join(' ')`, ce qui détruisait lignes et colonnes avant même l'appel au modèle.
  Correction : les PDF (< 4 Mo) partent tels quels en bloc `document`, le modèle
  voit la mise en page ; au-delà, repli sur une extraction qui reconstruit la
  géométrie (séparateur « | » entre cellules).
  **Vérifié en réel** sur `exemple de planning p1.pdf` : 7 semaines extraites en
  4,9 s. RESTE À FAIRE : le prompt français est centré graphèmes, il ne récupère
  donc pas encore les séances détaillées (LC, vocabulaire, geste d'écriture, PDE,
  grammaire, fluence) présentes dans le tableau. C'est l'objet du §5 Périodes.

## 3. Performance

- [x] **Latence** lors de la navigation dans les menus (à profiler/optimiser).
  → FAIT. Cause : aucune route n'avait de `loading.tsx` et les requêtes Supabase
  partaient en série (5 à 6 par page), donc l'écran restait figé sur la page
  précédente. Squelette de chargement sur les 6 routes, requêtes de l'accueil
  parallélisées, comptages en `count/head` au lieu de rapatrier les lignes.
- [x] **Fonction "Undo"** : retour en arrière lors de la modification de l'EDT.
  → FAIT : bouton « Annuler » + Ctrl+Z, 30 niveaux. Toutes les mutations de la
  grille passent par un point unique (`modifier`) qui empile l'état précédent.

## 4. Réinitialisation & règles de génération

- [x] **Bouton de réinitialisation "efface tout SAUF la classe"** → l'EDT doit
  devenir **vide** (différent du reset actuel qui recharge la trame). (cf. choix
  demandé plus tôt "vider complètement".)
  → FAIT : scope `edt-vide` (bouton « 🗑️ Vider », sans rechargement de trame) et
  action `reinitialiserContenuClasse()` (bouton « 🧽 Effacer tout sauf ma classe »),
  qui garde le prénom, le manuel et la date de rentrée. L'ancien bouton
  « Remettre à zéro » conserve son comportement pour ne surprendre personne.
- [x] **Bouton "Générer l'EDT avec l'IA / quotas réglementaires"** → FAIT le 20/07
  (générateur depuis le volume horaire officiel, commit 98955c1/543923e). À
  compléter avec les contraintes ci-dessous.
- [x] **Contraintes de l'EDT généré** (à ajouter au générateur) :
  - EPS, Histoire, Arts plastiques : **pas 2 h de la même matière le même jour**.
  - Matières générales : **pas plus de 2 h de la même matière le même jour**.
  - Objectif : **répartir les matières au mieux** sur la semaine.
  → FAIT : plafonds journaliers dans `edt-generator.ts` (1 h pour EPS/arts/histoire,
  2 h pour les matières générales), cumul partagé matin + après-midi, bloc code
  inclus. Créneau laissé vide plutôt que d'enfreindre la règle. 7 tests.
  Résultat : EPS sur 3 jours (30 + 60 + 60) au lieu d'un bloc, aucun trou.
  NOTE : la répartition respecte les plafonds mais reste inégale (lundi 2 h
  d'étude de la langue, mardi 30 min). Un vrai équilibrage (minimiser l'écart
  entre jours) serait un raffinement possible.

## 5. Périodes (docs d'exemple fournis)

- [x] Exploiter `exemple de planning p1.pdf` : structure réelle d'une **Période 1**
  en 7 semaines × 4 jours, avec séances (LC, graphèmes, vocabulaire, geste
  d'écriture, PDE, grammaire, fluence…). Modèle pour l'import « 1 doc par période »
  et la génération de progression par période.
  → FAIT : mode d'import « planning de période » (`systemImportPeriode`), choix du
  type de document dans l'import. **Vérifié en réel** : 7 semaines et 93 séances
  extraites (contre 17 graphèmes avec l'ancien prompt), en 19,1 s.
- [x] **Décalage par période** (P2 à P5 ne doivent pas écraser P1).
  → FAIT : `src/lib/actions/progression-periode.ts`. Les bornes viennent de
  `semaines.periode_numero` (périodes réelles de la classe, pas un « 7 semaines »
  forcé). L'enregistrement ne supprime que l'intervalle importé. Sélecteur de
  période dans l'import, débordement signalé au lieu d'être perdu.
- [x] `partage/edt.pdf` : exemple d'emploi du temps (à lire et exploiter).
  → FAIT, et il a changé la conclusion. La grille réelle de Cécile (8h20-16h30,
  rituels de 5 min, créneaux de 20-30 min, intitulés très personnels) ne
  ressemble pas du tout à ce que produit le générateur. La bonne réponse n'est
  donc pas de générer mieux mais de permettre d'**importer** sa grille telle
  quelle : route `/api/ia-edt` + bouton « 📄 Importer depuis un PDF » avec aperçu
  avant remplacement. Vérifié en réel : 90 créneaux sur 4 jours, aucun rejet.

## Notes de priorisation

Items rapides et sûrs (faible risque) d'abord : accueil (cartes taille/cliquable,
retrait Paramètres/Aide, ancre méthodes, carte EDT, carte cahier en cours), crayon
pour la mise en forme EDT. Puis contraintes du générateur EDT. Puis les gros
chantiers (outil IA centralisé + lecture PDF, undo EDT, reset "vide", import par
période). Le chantier livret LSU (Phase 3, option B validée) reste en parallèle.
