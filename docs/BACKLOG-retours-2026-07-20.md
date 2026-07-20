# Backlog retours utilisateurs (20/07/2026)

Source : `partage/probleme a régler.docx` (Christophe). Consigne : « structure au
mieux pour avancer, je ne serai pas là pour essayer mais il faut avancer au
maximum ». Docs d'exemple ajoutés pour les périodes : `partage/exemple de planning
p1.pdf`, `partage/edt.pdf`.

Statut : [ ] à faire · [~] en cours · [x] fait.

## 1. UI / UX & Navigation

- [ ] **Mise en forme des cases EDT trop lourde** : masquer les contrôles (couleurs,
  B/i/U) derrière un **petit crayon cliquable** à côté du nom de la matière, qui
  déroule le menu de mise en page. (Rendre discret ce qui a été ajouté le 20/07.)
- [ ] **Accueil : cartes "Paramètres" et "Aide" inutiles** (déjà dans le header) →
  les retirer, remplacer par une **bulle explicative au survol**.
- [ ] **Planning de la semaine** : ajouter un **accès déroulant à l'emploi du temps**
  pour vérifier avant de générer le cahier journal.
- [ ] **Carte "Ajoute tes matières"** : la mettre à la **même taille** que les autres
  cartes.
- [ ] **Carte "Mes outils IA"** : la rendre **cliquable et dépliable**.
- [ ] **Nouvelle carte "Cahier journal en cours"** : accès rapide au cahier de la
  semaine actuelle (identifiée par date/numéro) ; le menu doit aussi permettre de
  consulter/gérer les cahiers des **semaines à venir**.
- [ ] **"Mes méthodes et progression"** : au clic, arriver **directement au bon
  endroit** de la page (ancre `#methodes`).
- [ ] **Nouvelle carte "Emploi du temps"** sur l'accueil (accès rapide).
- [ ] **Bouton "Mon assistant"** toujours visible : ouvre le chat + l'import.
- [ ] **Carte "Configuration initiale"** sur l'accueil (option importante).

## 2. Fonctionnalités IA & Importation

- [ ] **L'IA ne lit pas les PDF** (seulement le texte collé dans le chat). Besoin
  d'un **outil IA centralisé, toujours accessible**, capable d'**importer des
  plannings PDF** et de **modifier ceux en cours**.
- [ ] **Lecture fidèle des tableaux PDF** : les programmes téléchargés sont souvent
  des tableaux PDF ; l'outil doit les lire précisément et **copier exactement** le
  contenu. (cf. `exemple de planning p1.pdf` : tableau Semaine × Jour × séances.)

## 3. Performance

- [ ] **Latence** lors de la navigation dans les menus (à profiler/optimiser).
- [ ] **Fonction "Undo"** : retour en arrière lors de la modification de l'EDT.

## 4. Réinitialisation & règles de génération

- [ ] **Bouton de réinitialisation "efface tout SAUF la classe"** → l'EDT doit
  devenir **vide** (différent du reset actuel qui recharge la trame). (cf. choix
  demandé plus tôt "vider complètement".)
- [x] **Bouton "Générer l'EDT avec l'IA / quotas réglementaires"** → FAIT le 20/07
  (générateur depuis le volume horaire officiel, commit 98955c1/543923e). À
  compléter avec les contraintes ci-dessous.
- [ ] **Contraintes de l'EDT généré** (à ajouter au générateur) :
  - EPS, Histoire, Arts plastiques : **pas 2 h de la même matière le même jour**.
  - Matières générales : **pas plus de 2 h de la même matière le même jour**.
  - Objectif : **répartir les matières au mieux** sur la semaine.

## 5. Périodes (docs d'exemple fournis)

- [ ] Exploiter `exemple de planning p1.pdf` : structure réelle d'une **Période 1**
  en 7 semaines × 4 jours, avec séances (LC, graphèmes, vocabulaire, geste
  d'écriture, PDE, grammaire, fluence…). Modèle pour l'import « 1 doc par période »
  et la génération de progression par période.
- [ ] `partage/edt.pdf` : exemple d'emploi du temps (à lire et exploiter).

## Notes de priorisation

Items rapides et sûrs (faible risque) d'abord : accueil (cartes taille/cliquable,
retrait Paramètres/Aide, ancre méthodes, carte EDT, carte cahier en cours), crayon
pour la mise en forme EDT. Puis contraintes du générateur EDT. Puis les gros
chantiers (outil IA centralisé + lecture PDF, undo EDT, reset "vide", import par
période). Le chantier livret LSU (Phase 3, option B validée) reste en parallèle.
