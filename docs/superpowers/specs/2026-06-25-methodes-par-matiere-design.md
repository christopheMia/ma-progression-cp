# Spec — Méthodes par matière (généralisation au-delà de français/maths)

> Conçu le **2026-06-25** (skill brainstorming). Vague 0 du programme « n°1 du marché »
> (voir `docs/STRATEGIE-N1-MARCHE.md`). But : ouvrir les méthodes à **n'importe quelle matière**
> et débloquer **CP→CM2**, pour une beta gratuite (Cécile + groupe d'enseignants).

## 1. Problème

Aujourd'hui seules **2 matières** peuvent avoir une méthode :
- `src/lib/matieres.ts` : `MATIERES_METHODE = ['francais', 'maths']` **codé en dur**.
- `src/lib/cahier-journal.ts` → `matiereMethode()` : relie un créneau à une matière **par mots-clés**
  (« graphème » → français, « math/calcul » → maths). Tout le reste renvoie `null` → pas de remplissage.

La table `progression` est **déjà générique** (`class_id, matiere, numero, items[], pages, mots_exemple`)
et `enregistrerProgressionMatiere(matiere, …)` marche déjà pour n'importe quelle matière : la base de
données est prête, c'est la **couche méthode↔créneau** qui est fermée.

## 2. Décisions produit (validées)

1. **Lien méthode↔créneau par sélection** (pas par mot-clé deviné) : à l'import, l'enseignante coche
   quels créneaux de SON emploi du temps la méthode alimente.
2. **Modèle souple** : une méthode peut couvrir **plusieurs créneaux**, même de libellés différents
   (ex. une méthode de lecture qui alimente « Lecture » ET « Phono »). Lien stocké explicitement.
3. **Tous les créneaux liés** affichent automatiquement le contenu de la **semaine en cours**.
4. **Suivi élèves (étoiles) en opt-in par méthode** : case « 📊 Suivre les acquis », cochée par défaut,
   décochable (éviter le bruit sur EPS/Arts). Risque identifié : sinon les enseignantes en mettent partout.
5. **Cahier journal = fil conducteur** : **toutes** les matières de la journée s'affichent en lignes
   (horaire + matière). Créneaux avec méthode = déroulement pré-rempli ; sans méthode = ligne présente,
   déroulement léger/vide. **Interrupteur de visibilité** par créneau (affiché par défaut, masquable).
   Le développement détaillé d'un créneau passera par un bouton **« ✨ Créer / développer »** (= séance
   détaillée, Vague 2) → IA **à la demande**, jamais en masse automatique (protège le budget IA).
6. **Périmètre v1 = CP→CM2.** Maternelle (PS/MS/GS) plus tard (modèle différent : domaines, pas 36 sem.).

## 3. Approche d'implémentation (validée : « Approche 2 — table propre »)

Introduire une vraie table `methodes` plutôt que réutiliser le texte `matiere` comme clé fragile.
C'est la **fondation** sur laquelle s'appuieront LSU, différenciation et séances détaillées.

### 3.1 Modèle de données

**Nouvelle table `methodes`**
| Champ | Type | Rôle |
|---|---|---|
| `id` | uuid pk | |
| `class_id` | uuid → classes (cascade) | appartenance / RLS |
| `matiere` | text | discipline affichée (« Lecture », « Anglais », « Maths ») |
| `manuel` | text null | nom du manuel (« Lecture Piano ») — optionnel |
| `niveau` | text null | ex. « CP » — optionnel, utile multi-niveaux futur |
| `suivi_actif` | boolean default true | opt-in du suivi étoiles |
| `created_at` | timestamptz default now() | |

RLS : `class_id in (select id from classes where user_id = auth.uid())` (using + with check), comme `progression`.

**Modifs tables existantes**
- `emploi_du_temps` : `+ methode_id uuid null → methodes` (LE lien) ; `+ visible_journal boolean default true`.
- `progression` : `+ methode_id uuid → methodes`. On **conserve** `matiere` (repli/compat) mais la clé
  logique devient `methode_id`. Nouvelle unicité `(methode_id, numero)`.
- `acquisitions` / `appreciations` : **inchangées** (colonne `matiere` texte déjà générique). Le suivi est
  affiché ou non selon `methodes.suivi_actif`. Normalisation vers `methode_id` reportée (non bloquante).

### 3.2 Migration `008_methodes.sql` (idempotente)

1. `create table if not exists methodes …` + RLS (blocs `do $$ … exception when duplicate_object`).
2. `alter table emploi_du_temps add column if not exists methode_id …`, `… visible_journal …`.
3. `alter table progression add column if not exists methode_id …`.
4. **Backfill** (idempotent) :
   - pour chaque `(class_id, matiere)` distinct de `progression` sans méthode → créer une `methode`
     (`matiere`, `suivi_actif = true`) puis `update progression set methode_id = …`.
   - pour les créneaux `emploi_du_temps` sans `methode_id` → rejouer **une seule fois** l'ancienne logique
     mots-clés (« graphème/graphe » → méthode française de la classe ; « math/calcul » → méthode maths)
     pour poser `methode_id`. Non reconnus → restent `null`.
5. Mettre à jour `006_schema_complet_idempotent.sql` (source de vérité) pour inclure `methodes` + colonnes.

⚠️ **Sauvegarde `pg_dump` AVANT application** (règle fiabilité, cf. `STRATEGIE-N1-MARCHE.md`).

### 3.3 Code

- `src/lib/matieres.ts` : **supprimer** `MATIERES_METHODE`/`LABELS_MATIERE`/`isMatiereMethode` codés en dur.
  Les matières deviennent dynamiques (lues depuis `methodes`). Garder des types génériques si utiles.
- `src/lib/cahier-journal.ts` : **supprimer** `matiereMethode()`. `deroulementInitial(creneau, progression)`
  lit `creneau.methode_id` et trouve la ligne `progression` de la **semaine courante** pour cette méthode.
  Respecter `visible_journal` (ligne masquée si faux). Toutes les lignes de la journée restent générées.
- Import IA (`src/components/setup/IaImport.tsx`, action `enregistrerProgressionMatiere`,
  route `api/ia-manuel`) : à l'import, **créer/sélectionner une `methode`**, faire **cocher les créneaux EDT**
  couverts (set `methode_id`), régler `suivi_actif`.
- Éditeurs EDT (`TimetableEditor` setup, `EmploiDuTempsEditor` paramètres) : par créneau, liste déroulante
  « Méthode liée » (parmi les méthodes de la classe) + interrupteur « afficher dans le journal ».
- `StudentTracking` : itérer sur les méthodes où `suivi_actif = true` (au lieu de la liste en dur).
- Section **« 📚 Mes méthodes »** (paramètres) : lister/éditer les méthodes, basculer `suivi_actif`.
- Vérifier les points d'intégration existants qui ciblent `matiere='francais'` (`corrigerProgression`,
  `updateManuel`, repli `semaine.graphemes`) → les router via `methode_id`.

### 3.4 Parcours utilisateur
1. Paramètres → « 📚 Mes méthodes » → « + Ajouter une méthode ».
2. Nommer la matière → importer le manuel (IA) → progression 36 semaines.
3. Cocher les créneaux EDT alimentés (souple, multi-créneaux).
4. Opt-in « 📊 Suivre les acquis ».
5. Journal + suivi se remplissent seuls, chaque semaine.

## 4. Hors périmètre (YAGNI pour cette spec)
- Maternelle (modèle dédié). · Multi-classes (Vague 4). · Génération de séance détaillée (Vague 2 — on
  garde seulement la structure du journal prête à accrocher le bouton « développer »). · LSU / évaluations
  (Vague 3). · Normalisation `acquisitions`/`appreciations` vers `methode_id`.

## 5. Critères de réussite
- Une enseignante peut créer une méthode pour **n'importe quelle matière** et la relier à **un ou plusieurs**
  créneaux de son EDT (de libellés différents).
- Le cahier journal affiche **toutes** les matières de la journée ; les créneaux liés sont **pré-remplis**
  avec le contenu de la semaine courante ; un créneau peut être **masqué**.
- Le suivi étoiles n'apparaît que pour les méthodes **opt-in**.
- Données de Cécile **préservées** après migration (français + maths continuent de fonctionner).
- `MATIERES_METHODE` et `matiereMethode()` n'existent plus ; aucune matière n'est codée en dur.
- Build propre + tests verts.
