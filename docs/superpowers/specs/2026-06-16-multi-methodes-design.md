# Conception — Plusieurs méthodes combinées (Français + Maths) sans écrasement

**Date :** 2026-06-16
**Statut :** validé en brainstorming, rédaction du plan à suivre

## 1. Problème

Aujourd'hui toute l'application est construite autour d'**une seule méthode = la lecture/français**. Le contenu de la méthode (les « graphèmes ») est stocké **directement dans la table `semaines`**, et le suivi élève (`acquisitions`) pointe vers un `grapheme`. Conséquence : importer une nouvelle méthode **écrase** la précédente. Impossible d'avoir une méthode de **Français** ET une méthode de **Maths** en même temps.

Cécile utilise deux méthodes réelles :
- **Français** : *J'apprends à lire avec les P'tites Poules* (Bordas) — sommaire **semaine par semaine**.
- **Maths** : *Maths au CP* (Accès) — programmation **par période et par domaine** (pas par semaine).

## 2. Objectif

Permettre d'**ajouter et combiner plusieurs méthodes** (Français + Maths) **sans que l'une écrase l'autre**, avec, pour **chaque matière** :
1. l'affichage de la progression (planning + fiche semaine),
2. le suivi par élève (étoiles ★),
3. le bilan IA par élève,
4. le cahier journal qui reprend les contenus de chaque matière.

**Périmètre volontairement limité (YAGNI)** : 2 matières « méthodes » importables (`francais`, `maths`). Pas de matières configurables/colorables librement pour l'instant (évolution future possible). Les **matières de l'emploi du temps** (libres) restent indépendantes de ce périmètre.

## 3. Récupération des progressions — décision

Les progressions officielles ne sont **pas récupérables automatiquement de façon fiable** (guides pédagogiques payants, PDF illisibles, docs tiers non officiels). C'est exactement le problème qui avait fait abandonner les progressions « écrites en dur ».

**Décision** : remplissage par **import IA, une méthode par matière**. L'enseignant dépose le(s) PDF de programmation/sommaire (ou colle le texte). L'import écrit **uniquement** la matière concernée → jamais d'écrasement de l'autre.

## 4. Modèle de données (approche retenue : « matière comme dimension »)

`semaines` devient le **squelette temporel** (n° de semaine + date) ; le contenu des méthodes sort dans une table dédiée, **par matière**.

### Nouvelle table `progression`
Une ligne par (matière × semaine).

| colonne | type | exemple |
|---|---|---|
| `id` | uuid PK | |
| `class_id` | uuid FK → classes (cascade) | |
| `matiere` | text (`'francais'` \| `'maths'`) | `'maths'` |
| `numero` | int (1→36) | `8` |
| `items` | text[] | `['a','i','y']` ou `['Nombres jusqu'à 10','Décomposer 4 et 5']` |
| `pages` | text (nullable) | `'p. 12-15'` |
| `mots_exemple` | text[] (nullable) | `['ami','lune']` |

Contrainte d'unicité : `unique(class_id, matiere, numero)`. RLS identique aux autres tables (via `class_id`).

### Tables existantes adaptées
- `semaines` : **on retire** `graphemes`, `manuel_pages`, `mots_exemple` (migrés vers `progression`). On **conserve** `numero`, `date_debut`, `edm_theme`, `edm_competences`, `note`. (« Explorer le monde » reste un simple affichage, pas une méthode importée.)
- `acquisitions` : **+ colonne `matiere`**. Nouvelle unicité `unique(semaine_id, eleve_id, matiere, grapheme)`. (`grapheme` est conservé comme nom de colonne mais contient l'« item » de la matière.)
- `appreciations` : **+ colonne `matiere`**. Nouvelle unicité `unique(semaine_id, eleve_id, matiere)` → un bilan par matière.

### Inchangé
`classes`, `eleves`, `emploi_du_temps`, `cahier_journal`, dates de rentrée.

### Migration des données existantes (sans perte)
Migration SQL `003_multi_methodes.sql` :
1. Créer `progression`.
2. Pour chaque `semaines` existante : insérer une ligne `progression(matiere='francais', numero, items=graphemes, pages=manuel_pages, mots_exemple)`.
3. Ajouter colonne `matiere` à `acquisitions` et `appreciations`, valeur par défaut `'francais'` pour l'existant, puis adapter les contraintes d'unicité.
4. (Étape finale, après bascule du code) retirer `graphemes`/`manuel_pages`/`mots_exemple` de `semaines`.

Le français existant de Cécile est conservé tel quel, simplement « rangé » dans la matière `francais`.

## 5. Import IA multi-matières / multi-fichiers (fiable)

### Déroulé utilisateur (onglet « 🤖 Import IA » enrichi + section Paramètres « Mes méthodes »)
1. Choisir la **matière** à importer (`Français` / `Maths`).
2. **Déposer un ou plusieurs PDF d'un coup** (`<input multiple>`) **ou** coller le sommaire. Avertissement UI : *« Dépose les pages de programmation, pas le manuel entier (budget + rapidité). »*
3. Le **navigateur** extrait le texte de tous les fichiers (`pdf-client.ts`), les concatène.
4. Envoi à l'IA (**Sonnet `claude-sonnet-4-6`, jamais Opus** — Opus dépasse le timeout serverless Vercel). Payload **texte seulement** (< 4,5 Mo Vercel).
5. Tableau **éditable** + **chat de correction** (comme aujourd'hui).
6. Enregistrement : action `enregistrerProgressionMatiere(matiere, items[])` → *delete + insert* **filtré sur la matière** → l'autre matière n'est jamais touchée.

### Fiabilité — « aucun sujet oublié » (exigence forte)
Garantie **par conception, pas par confiance dans l'IA**, en 2 étapes + contrôle code :

1. **Extraction exhaustive** : l'IA recopie d'abord la **liste complète** des notions, période par période, domaine par domaine (tâche de recopie structurée → fiable). C'est la **liste de référence**.
2. **Répartition par semaine** : l'IA répartit **ces notions-là** (pas d'invention) sur les ~7 semaines de chaque période.
   - Français : déjà semaine par semaine dans la source → mapping quasi direct.
   - Maths : source par période → l'IA **étale** les notions sur les semaines de la période (approximatif, éditable).
3. **Contrôle de couverture automatique (code)** : le code vérifie que **chaque notion de la liste de référence apparaît au moins une fois** dans le planning hebdo. Toute notion manquante est **affichée en alerte** (« ⚠️ N notions non placées : … ») pour réinjection / relance. **Aucune notion ne disparaît silencieusement.**

### Adaptations techniques
- `src/lib/ia/schema.ts` : `graphemes` → `items` (générique). Le schéma structuré garde `numero`, `items`, `pages`, `mots_exemple`.
- `src/lib/ia/prompts.ts` : prompt adapté selon `matiere` (`francais` = sons/graphèmes ; `maths` = notions/compétences par domaine), avec consigne d'extraction exhaustive puis répartition.
- `src/app/api/ia-manuel/route.ts` : reçoit `matiere` en plus du texte.
- `src/components/setup/IaImport.tsx` : sélecteur de matière + `<input multiple>` + concaténation + affichage du contrôle de couverture.
- Setup `/setup` : importer **Français** (pour démarrer) puis **Maths** (optionnel) ; Maths ajoutable plus tard via Paramètres.

## 6. Affichage, suivi, bilan (par matière) — Section 3A

### Affichage progression
- Fiche semaine : **un bloc par matière** (Français : graphèmes/mots/pages ; Maths : notions), séparés et étiquetés.
- Planning annuel : 36 cartes conservées, indication du contenu par matière.
- « Explorer le monde » : bloc d'affichage inchangé.

### Suivi élève (`StudentTracking`)
- **Sections/onglets par matière** : un tableau d'étoiles ★ pour le Français (par graphème) **et** un pour les Maths (par notion).
- `acquisitions.matiere` permet de cocher par élève dans chaque matière sans mélange.
- Confettis 🎉 et barres de progression : par matière.

### Bilan (`appreciations` + « ✨ Bilan IA »)
- **Un bilan par matière et par élève** (boutons « ✓ Acquis / Pas encore » + commentaire libre).
- Bilan IA **RGPD-safe** : prénom jamais envoyé (placeholder `[ELEVE]`), on précise seulement la matière + notions acquises/non acquises.

### Paramètres
- Section « **Mes méthodes** » : pour chaque matière, bouton « Importer / corriger via l'IA ». Réimport filtré sur la matière.

## 7. Cahier journal (3 colonnes) — Section 3B *(à finaliser avec la trame)*

- Fiche **par journée**, **date en haut**.
- Tableau **3 colonnes** : **Horaires** (compacte) · **Matière** (compacte) · **Déroulement** (large, extensible en largeur ET hauteur, robuste à l'impression — `table-layout` adapté + retour à la ligne).
- **Alimentation automatique** : pour chaque jour, lecture des **créneaux `emploi_du_temps`** (→ Horaires + Matière) ; remplissage du **Déroulement** depuis la **`progression` de la matière** pour la semaine en cours. Éditable à la main.
- Exports impression / Word / Google Docs conservés.
- **À caler sur la trame de la collègue** : rendu exact du « Déroulement » (niveau de détail), format de la date, lignes spéciales éventuelles (accueil/rituels, récréation…).

> Cette section sera détaillée/figée à réception de la trame ; le reste de la conception ne dépend pas de ce détail visuel.

## 8. Découpage en livraison (pour le plan)

1. **Migration BDD** `003_multi_methodes.sql` + adaptation des types/lectures (`progression`, `matiere` sur acquisitions/appreciations).
2. **Import IA multi-matières/multi-fichiers** + extraction exhaustive + contrôle de couverture.
3. **Affichage progressions** par matière (fiche semaine + planning).
4. **Suivi élève + bilan** par matière.
5. **Cahier journal 3 colonnes** (à la réception de la trame).

Chaque étape se construit sur le squelette temporel commun (`semaines`) et reste indépendante des autres.

## 9. Risques / contraintes connues

- **Timeout Vercel (~10 s, plan gratuit)** → Sonnet obligatoire, payload texte seulement, ne pas envoyer le manuel entier.
- **Coût IA** → carte plafonnée (~8 €) + plafond mensuel console Anthropic ; avertissement UI « pages utiles seulement ».
- **Répartition maths à la semaine** = inférence IA approximative (source par période) → vérifiée par le contrôle de couverture et ajustable via le chat.
- **Migration** : étape de suppression de colonnes `semaines` à faire **après** bascule du code, pour éviter toute perte.
