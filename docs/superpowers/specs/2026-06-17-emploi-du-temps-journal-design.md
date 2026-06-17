# Emploi du temps (grille pré-remplie) + Cahier journal IA — Conception

> Date : 2026-06-17 · Branche : `feat/multi-methodes` · Auteur : session brainstorming avec Christophe.

## 1. But

Deux fonctionnalités liées, à partir de la **vraie trame d'emploi du temps** de Cécile (`docsmethodes/edt.pdf`) :

1. **Emploi du temps** : remplacer l'éditeur actuel « page blanche, un créneau à la fois » par une **grille pré-remplie** avec la trame CP réelle, **entièrement modifiable** par Cécile (cases, horaires, lignes, couleurs).
2. **Cahier journal 3 colonnes** : une fiche **par journée** (date en haut ; colonnes Horaires / Matière / Déroulement) alimentée depuis l'emploi du temps, avec un bouton **« ✨ Générer la journée »** qui fait amorcer par l'IA le déroulement de **chaque** matière. Tout reste éditable.

Plus un **garde-fou crédit IA** (message d'épuisement + jauge de budget estimée).

**Contrainte transverse (consigne de Christophe)** : tout ce qui est « généré » (emploi du temps pré-rempli, journal amorcé par l'IA) doit **toujours rester modifiable** par Cécile.

## 2. Périmètre et dépendance

- **Ce chantier dépend du chantier multi-méthodes** (`docs/superpowers/specs/2026-06-16-multi-methodes-design.md`) : le déroulement « ✨ données » des créneaux Graphèmes (français) et Mathématiques se lit dans la table **`progression(class_id, matiere, numero, items, …)`** créée par ce chantier.
- **Ordre de réalisation retenu** : (1) implémenter d'abord le plan multi-méthodes (phases 1-4) qui crée `progression` ; (2) puis ce chantier. La partie **grille d'emploi du temps n'a aucune dépendance** et pourrait être livrée en premier, mais reste regroupée ici pour la cohérence.
- YAGNI : pas de configurateur de couleurs avancé, pas de gestion multi-classes, pas d'IA pour les créneaux « routine ».

## 3. La trame de référence

`docsmethodes/edt.pdf` — emploi du temps CP, **4 jours** (Lundi / Mardi / Jeudi / Vendredi, pas de mercredi), créneaux de 8h20 à 16h30. Caractéristiques notables :

- **Lignes « routine »** communes à tous les jours : *Accueil dans la cour*, *Rituels du jour, appel…*, *Récréation* (×2), *Pause déjeuner / APC*, *Bilan de la journée, cartable*.
- **Lignes « cours »** : matières qui peuvent **différer par jour** sur un même horaire (ex. 14h15-14h45 : Histoire-géo / Arts visuels / Sciences / Anglais), ou être identiques (Appropriation des graphèmes, Calcul mental, Mathématiques…).
- **Couleurs** par famille de matière : français/lecture = bleu, maths = rose, arts = violet, anglais = orange, EPS = jaune, routines = gris.
- Petites imperfections de la trame (chevauchement 11h20/11h30, EPS s'étalant sur deux créneaux le lundi/jeudi) : on encode la trame fidèlement ; Cécile ajuste si besoin.

La trame est encodée en dur comme constante `TRAME_EDT_CP` (sur le modèle des données de démo), une ligne par (jour × créneau), avec `type` (`cours`/`routine`) et `couleur`.

## 4. Emploi du temps — grille pré-remplie et modifiable

### Modèle de données
On **conserve** la table `emploi_du_temps` (`jour, heure_debut, heure_fin, matiere, ordre`) et on ajoute deux colonnes (migration `005`) :
- `couleur text` — code couleur de la case (nullable ; valeur par défaut dérivée d'une palette par matière).
- `type text not null default 'cours'` — `'cours'` ou `'routine'`.

Pas de refonte du modèle : la grille est **dérivée à l'affichage** en groupant les créneaux par tranche horaire. Les lignes « communes à tous les jours » sont stockées une fois par jour (mêmes valeurs) et **rendues fusionnées** quand les cases adjacentes sont identiques (détail d'affichage, pas de stockage spécial).

### Pré-remplissage
- À la **création de classe** (`setup`), l'emploi du temps est pré-rempli depuis `TRAME_EDT_CP` au lieu d'être vide.
- En **paramètres**, bouton **« Recharger l'emploi du temps type »** pour repartir de la trame.

### Éditeur en grille (remplace les deux éditeurs actuels)
- Remplace `TimetableEditor` (setup) et `EmploiDuTempsEditor` (paramètres) par un composant unique **`TimetableGrid`** : lignes = tranches horaires, colonnes = Lun/Mar/Jeu/Ven.
- Chaque **case** est éditable : changer la matière (liste connue + « Autre… » libre), la couleur (palette), marquer une ligne `routine`.
- Ajouter / supprimer une **tranche horaire** (ligne) ; modifier les horaires d'une ligne.
- **Couleurs gardées** (repère visuel pour Cécile) : palette par défaut par matière, modifiable par case.
- Aucune génération bloquée : la trame fournit déjà un EDT complet ; Cécile part de là.

## 5. Cahier journal — 3 colonnes, par journée, amorcé par l'IA

### Rendu
- Une **fiche par journée** : **date en haut** (jour + date calculée depuis la rentrée + n° de semaine).
- Tableau **3 colonnes** : **Horaires** (compacte) · **Matière** (compacte) · **Déroulement** (large, extensible, robuste à l'impression).
- Les lignes `routine` (Accueil, Récréation, Pause, Bilan) apparaissent comme **lignes grisées, non remplissables** (pas de déroulement).
- Les lignes `cours` ont un champ **Déroulement** éditable (texte multi-lignes), sauvegarde automatique.

### Alimentation
- **« ✨ données »** : pour les créneaux dont la matière correspond à une méthode (Graphèmes → `progression(matiere='francais')`, Mathématiques/Calcul mental → `progression(matiere='maths')`), le déroulement est pré-rempli depuis le contenu de la **semaine en cours** (items, pages, mots-exemple).
- **« 🤖 IA »** : bouton **« ✨ Générer la journée »** → route `api/ia-journal` (Sonnet). L'IA reçoit, pour la journée, la liste des créneaux `cours` (matière + horaires) + le contenu de la semaine (français/maths), et renvoie un **déroulement amorcé par créneau**, adapté au CP. Les créneaux « données » peuvent être enrichis ; les autres matières (Écriture, Phono, Vocabulaire, Histoire-géo, EPS, Arts, Anglais, EMC, Sciences…) reçoivent une amorce plausible.
- **Tout est éditable** après génération ; Cécile relit et ajuste.

### Stockage
- On **réutilise la table `cahier_journal`** existante (`semaine_id unique`, `contenu jsonb`). Le `contenu` jsonb porte, par jour, la liste des créneaux `{ horaires, matiere, type, deroulement }`. Adapter `src/lib/cahier-journal.ts` (génération) et `CahierJournalEditor.tsx` (rendu 3 colonnes) au nouveau format.
- Migration douce : un journal au format actuel (objectif/activité/matériel) qui n'a pas encore été régénéré reste lisible ; à la prochaine génération il passe au format 3 colonnes. *(Décision d'implémentation : convertir à la lecture ou régénérer ; le plan tranchera.)*

### RGPD
Aucune donnée élève n'est envoyée à l'IA — seulement les matières, horaires et le contenu (sons/notions/pages) de la semaine. Cohérent avec l'import IA et le bilan IA existants.

## 6. Garde-fou crédit IA

**Limite connue** : l'API Anthropic (clé standard) **n'expose pas le solde de crédit restant** ; pas de vraie jauge « crédit restant ». On met donc en place deux mécanismes côté appli :

1. **Message d'épuisement clair (fiable).** Les routes IA détectent l'erreur de facturation Anthropic (crédit épuisé / `billing_error`) et renvoient un message explicite affiché à Cécile : *« ⚠️ Le crédit IA est épuisé. Préviens l'administrateur pour le recharger. »* — au lieu du « erreur réseau » actuel. Le reste de l'appli continue de fonctionner.
2. **Jauge de budget estimée (proactive, approximative).** Chaque réponse IA renvoie l'usage en tokens (`usage.input_tokens` / `output_tokens` / cache). On accumule un total mensuel par classe (nouvelle table `ia_usage` ou colonnes dédiées), on l'estime en € au tarif Sonnet (`claude-sonnet-4-6` : 3 $/1M entrée, 15 $/1M sortie), et on affiche un indicateur discret *« budget IA estimé ce mois : ~X € / plafond »* qui passe en orange à l'approche du plafond. C'est une **estimation côté appli**, pas le solde réel Anthropic.

Le plafond mensuel est une constante configurable (défaut aligné sur la carte plafonnée ~8 €).

## 7. Rappels techniques

- **Modèle IA = `claude-sonnet-4-6`**, jamais Opus (dépasse le timeout serverless Vercel). Pas de `thinking`. Génération **par journée** (et non toute la semaine d'un coup) pour rester sous le timeout et borner le coût.
- Sorties structurées (schéma JSON) pour `api/ia-journal`, comme pour l'import IA.
- `emploi_du_temps` : migration `005` (ajout `couleur`, `type`) appliquée en prod via MCP Supabase / dashboard.
- Réutiliser les helpers existants (`addMinutes`/`diffMinutes`, exports Word/print/Google Docs).

## 8. Découpage en livraison (pour le plan)

1. **Migration `005`** (`emploi_du_temps` : `couleur`, `type`) + constante `TRAME_EDT_CP` + types.
2. **Pré-remplissage EDT** au setup + bouton « Recharger l'emploi du temps type » en paramètres.
3. **Éditeur grille `TimetableGrid`** (remplace `TimetableEditor` + `EmploiDuTempsEditor`), couleurs incluses.
4. **Cahier journal 3 colonnes** : nouveau format `contenu`, génération depuis `emploi_du_temps` + `progression`, rendu `CahierJournalEditor`.
5. **Route `api/ia-journal`** + bouton « ✨ Générer la journée » + édition/sauvegarde.
6. **Garde-fou crédit IA** : message d'épuisement (toutes les routes IA) + jauge de budget estimée.

Chaque étape se construit sur le squelette temporel commun (`semaines`) et la table `progression` (multi-méthodes).

## 9. Risques / contraintes connues

- **Dépendance multi-méthodes** : sans la table `progression`, le journal ne peut pas afficher le maths ; faire ce chantier après.
- **Couleurs & impression** : vérifier le rendu couleur en `@media print` (les fonds de cellule peuvent être ignorés selon le navigateur).
- **Format journal** : la bascule de l'ancien format (objectif/activité/matériel) au format 3 colonnes doit rester non destructive pour les journaux déjà générés.
- **Jauge de budget** : estimation, pas le solde réel ; bien le libeller pour ne pas induire Cécile en erreur.
- **Trame imparfaite** (chevauchements horaires) : encodée telle quelle, corrigée à la main si besoin.

## 10. Hors périmètre

- Vraie lecture du solde de crédit Anthropic (nécessiterait l'API d'admin + clé dédiée).
- Configurateur de couleurs avancé, thèmes par matière paramétrables.
- Emploi du temps multi-semaines (quinzaine A/B), demi-groupes.
