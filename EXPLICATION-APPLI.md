# Ma Progression CP — Explication complète de l'application

> Document à copier-coller pour expliquer à une IA (ou à un développeur) **ce que fait l'appli et comment elle fonctionne**, avec un focus détaillé sur l'API IA.

---

## 1. À quoi sert l'appli ?

**Ma Progression CP** est une application web pour les enseignant·es de CP (Cours Préparatoire, France). Elle aide à :

- **planifier l'année** : une progression semaine par semaine (jusqu'à 36 semaines) en **Français (lecture)** et en **Maths**, à partir du manuel/méthode de l'enseignant ;
- **suivre les élèves** : pour chaque élève et chaque semaine, cocher les sons/notions acquis (système d'étoiles ★/☆), rédiger un bilan et un commentaire ;
- **préparer le cahier journal** : un emploi du temps (EDT) génère un cahier journal en 3 colonnes (Horaires / Matière / Déroulement), exportable en Word, PDF ou Google Docs ;
- **gagner du temps grâce à l'IA** : importer un manuel en le faisant lire par l'IA, corriger la progression en langage naturel, générer des bilans d'élèves et amorcer les déroulements du cahier journal.

L'utilisatrice principale s'appelle **Cécile**. L'appli la tutoie et l'appelle par son prénom.

---

## 2. Stack technique

| Couche | Techno |
|---|---|
| Framework | **Next.js 16** (App Router) — ⚠️ version récente : protection des routes via `src/proxy.ts`, **PAS** `middleware.ts` |
| Hébergement | **Vercel** (https://ma-progression-cp.vercel.app) |
| Base de données + Auth | **Supabase** (PostgreSQL + Auth) |
| IA | **API Anthropic (Claude)** via `@anthropic-ai/sdk` |
| Langage | TypeScript / React |

### Authentification
- **Connexion** : `supabase.auth.signInWithPassword()` directement dans le navigateur.
- **Inscription** : appel à une **Edge Function Supabase `create-user`** (utilise la `SERVICE_ROLE_KEY` + `email_confirm: true`) → crée le compte sans email de confirmation.
- **Protection des routes** : `src/proxy.ts` redirige vers `/connexion` si non connecté, vers `/accueil` si déjà connecté.

### Variables d'environnement
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publiques, navigateur)
- `ANTHROPIC_API_KEY` (**SECRÈTE** — jamais `NEXT_PUBLIC_`, jamais exposée au navigateur)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (optionnelle — sans elle le bouton Google Docs est masqué)

---

## 3. Modèle de données (Supabase / PostgreSQL)

| Table | Rôle |
|---|---|
| `classes` | Une classe par enseignant (nom, date de rentrée, `prenom_enseignant`) |
| `eleves` | Les élèves de la classe |
| `semaines` | Les semaines de l'année (1→36), avec date de début recalculée depuis la rentrée |
| `progression` | **Source de vérité multi-méthodes** : `class_id, matiere, numero, items[], pages, mots_exemple` — une ligne par semaine **et par matière** |
| `acquisitions` | Ce que chaque élève a acquis (par semaine, par item, par `matiere`) → étoiles |
| `appreciations` | Bilan + commentaire par élève / semaine / matière |
| `emploi_du_temps` | Les créneaux horaires (matière, jour, heure début/fin, couleur, type) |
| `cahier_journal` | Le contenu rédigé du cahier journal |
| `ia_usage` | Journal de consommation IA (tokens entrée/sortie) pour estimer le budget |

**Multi-méthodes** : Français et Maths cohabitent sans s'écraser grâce à la colonne `matiere` (`'francais'` / `'maths'`, voir `src/lib/matieres.ts`). L'import IA est **non destructif entre matières**.

> Concept clé côté IA : un **« item »** = un graphème/son en lecture (ex. `"a"`, `"on"`) **ou** une notion en maths (ex. `"Nombres jusqu'à 10"`). C'est la généralisation de l'ancien terme « graphème ».

---

## 4. Parcours utilisateur (en bref)

1. **Inscription / Connexion** → `/connexion`
2. **Setup** (`/setup`) : créer la classe, saisir les élèves, l'emploi du temps, la date de rentrée, et **importer le manuel via l'IA**.
3. **Accueil** (`/accueil`) : tableau de bord (semaine en cours, % acquis, nb élèves, raccourcis, jauge de budget IA, outils externes Gemini/NotebookLM).
4. **Planning** : les 36 semaines, colorées par statut, avec correction IA de la progression.
5. **Page d'une semaine** : lecture + maths + suivi des élèves + cahier journal.
6. **Paramètres** (`/parametres`) : modifier élèves, EDT, date de rentrée, méthodes, prénom, ou tout réinitialiser.

---

## 5. ⭐ L'API IA en détail (le cœur de la question)

### 5.1 Principe général

- **Tous les appels à Claude se font côté SERVEUR** (routes Next.js sous `src/app/api/`), jamais depuis le navigateur. La clé API n'est donc jamais exposée.
- Le client est créé par `getAnthropicClient()` (`src/lib/ia/anthropic.ts`) qui lit `process.env.ANTHROPIC_API_KEY`. S'il manque la clé, il lève une erreur claire ; le reste de l'appli continue de fonctionner.
- **Modèle utilisé : `claude-sonnet-4-6`** pour TOUT (constantes `MODELE_IMPORT` et `MODELE_CHAT`).
  - ⚠️ **Pourquoi pas Opus ?** Opus dépasse le temps maximum des fonctions serverless Vercel (~10 s sur le plan gratuit) → « erreur réseau ». Sonnet est rapide et largement suffisant pour lire un sommaire. *(Repasser à `claude-opus-4-8` seulement avec un plan Vercel supérieur.)*
- Chaque route déclare `export const maxDuration = 60` (60 s max).
- **Pas de mode `thinking`** (réflexion étendue) : inutile pour ces tâches et trop lent pour le serverless.
- **Sorties structurées** : on impose à Claude un **schéma JSON** (`output_config.format = { type: 'json_schema', schema }`). Anthropic exige un **objet racine** (un tableau nu est refusé) → on enveloppe toujours, ex. `{ semaines: [...] }`.
- **Suivi de consommation** : après chaque appel, `enregistrerUsageIA(input_tokens, output_tokens)` écrit dans la table `ia_usage`.

### 5.2 Les 4 routes IA

| Route | Fichier | Modèle | max_tokens | Sortie structurée | Rôle |
|---|---|---|---|---|---|
| `/api/ia-manuel` | `route.ts` | Sonnet | 16000 | ✅ schéma progression | Import : lire un manuel → progression semaine par semaine |
| `/api/ia-chat` | `route.ts` | Sonnet | 16000 | ✅ `{progression, reponse}` | Correction conversationnelle de la progression |
| `/api/ia-bilan` | `route.ts` | Sonnet | 1000 | ❌ texte libre | Rédiger le bilan d'un élève |
| `/api/ia-journal` | `route.ts` | Sonnet | 1500 | ✅ `{deroulements[]}` | Amorcer les déroulements d'une journée |

---

#### A) `/api/ia-manuel` — Import d'un manuel

**Ce qu'elle prend en entrée :**
- Soit un **PDF** (multipart/form-data, champ `pdf`, max **30 Mo**) — extrait en texte côté serveur via `pdf-parse`, chargé paresseusement uniquement si un vrai PDF est présent ;
- Soit du **texte collé** (champ `texte` ou JSON `{ texte }`) — typiquement le sommaire du manuel ;
- Le champ `matiere` (`'francais'` ou `'maths'`).

> ⚠️ Note importante : en pratique, le **PDF est aussi souvent extrait DANS LE NAVIGATEUR** (`src/lib/ia/pdf-client.ts` via pdfjs) avant envoi, car **Vercel limite le corps des requêtes à ~4,5 Mo** (sinon `413 FUNCTION_PAYLOAD_TOO_LARGE`). On n'envoie alors que le texte.

**Traitement :**
- Vérifie que le texte fait ≥ 20 caractères.
- Appelle Claude avec un **prompt système spécialisé par matière** (`systemImport`, `src/lib/ia/prompts.ts`) :
  - Règle d'**exhaustivité en 2 temps** : 1) recenser TOUS les contenus du document ; 2) les répartir semaine par semaine. **Sans rien inventer.**
  - Lecture → `items` = graphèmes/sons ; Maths → `items` = notions, étalées ~7 semaines/période.
- Schéma JSON imposé : `{ semaines: [{ numero, items[], pages, mots_exemple[] }] }` (`PROGRESSION_JSON_SCHEMA`).

**Sortie / nettoyage :**
- `normalizeProgression()` (`src/lib/ia/schema.ts`) : nettoie les chaînes, **trie par numéro**, **plafonne à 36 semaines**, et **renumérote proprement 1, 2, 3…**.
- Si 0 semaine reconnue → erreur 422 (suggère de coller le sommaire en texte).

**RGPD :** cette route n'envoie **AUCUNE donnée élève** — uniquement des sons/semaines/pages.

---

#### B) `/api/ia-chat` — Correction conversationnelle de la progression

**Entrée :** `{ progression, message, prenom?, historique[] }`.

**Particularités importantes :**
- **Prompt caching activé** : le bloc système est marqué `cache_control: { type: 'ephemeral' }` sur DEUX segments — (1) les instructions (`systemChat`), (2) la progression actuelle sérialisée. Cela réduit le coût/latence des tours suivants.
- **Historique borné aux 10 derniers échanges** (`historique.slice(-10)`).
- **Personnalisation** : `systemChat(prenom)` fait **tutoyer** l'enseignant·e et l'appelle par son prénom. L'IA évite tout jargon (jamais « JSON », « tokens »…) — elle parle en « sons », « semaines », « pages ».
- **Comportement imposé** : l'IA **applique toujours la correction elle-même** sans reposer de question, renvoie la progression **complète** + une courte phrase d'explication amicale. Ex. « décaler d'une semaine », « semaine 5 c'est le son r ».

**Sortie :** schéma `{ progression[], reponse }` → la progression repasse par `normalizeProgression`.

> Côté UI, le composant `ProgressionCorrector` (bouton « 🤖 Corriger la progression » sur Planning **et** Accueil) consomme cette route. La sauvegarde est **non destructive** : elle ne met à jour QUE items/pages/mots via `corrigerProgression`, **sans toucher** au suivi des élèves, aux journaux ni aux dates.

---

#### C) `/api/ia-bilan` — Bilan d'un élève

**Entrée :** `{ numeroSemaine, matiere, itemsAcquis[], itemsNonAcquis[], statut }`.

**🔒 RGPD maximal — point crucial :**
- **Le prénom de l'élève ne quitte JAMAIS le navigateur.**
- L'IA reçoit seulement les sons/notions acquis ou non + un statut global. Le prompt (`SYSTEM_BILAN`) lui impose de désigner l'élève par le placeholder exact **`[ELEVE]`**.
- C'est **le navigateur** qui remplace `[ELEVE]` par le vrai prénom à l'affichage.

**Sortie :** texte libre (2–3 phrases, ton positif), `max_tokens: 1000`, **pas de schéma JSON**. Le bilan remplit le champ « Commentaire » (éditable, sauvegardé via `upsertAppreciation`).

---

#### D) `/api/ia-journal` — Amorce du cahier journal

**Entrée :** `{ numeroSemaine, creneaux[], francais[], maths[] }` (les créneaux = matière + horaires de la journée).

**Traitement :** `SYSTEM_JOURNAL` demande, **pour chaque créneau**, un déroulement court (1–2 phrases) adapté au CP :
- Lecture → s'appuie sur les sons de la semaine ;
- Maths → sur la notion de la semaine ;
- Autres matières → activité plausible et simple, sans inventer de contenu propre à l'école.

**Sortie :** schéma `{ deroulements: string[] }`, **un déroulement par créneau dans le même ordre**, `max_tokens: 1500`. Si aucun créneau → renvoie `[]` sans appeler l'IA. Déclenché par le bouton « ✨ Générer la journée ».

---

### 5.3 Gestion des erreurs IA

Fonction centrale `messageErreurIA(err)` (`src/lib/ia/erreurs.ts`), utilisée par les 4 routes :

| Cas détecté | Message à l'enseignant | Statut HTTP |
|---|---|---|
| Clé API manquante | « Service IA non configuré (clé API manquante). » | 500 |
| Crédit épuisé (`credit balance` / `billing` / `insufficient`) | « ⚠️ Le crédit IA est épuisé. Préviens l'administrateur pour le recharger. » | **402** |
| Autre | « Erreur IA. Réessaie dans un instant. » | 500 |

### 5.4 Coût et garde-fou budget

- **Tarif Sonnet 4.6** codé en dur (`src/lib/ia/cout.ts`) : **3 $/1M tokens d'entrée**, **15 $/1M tokens de sortie** (conversion ≈ ×0,92 pour l'euro, ordre de grandeur).
- **Plafond mensuel estimé : 8 €** (`PLAFOND_EUROS`), aligné sur une carte bancaire plafonnée côté console Anthropic.
- Une **jauge de budget** (`BudgetIaIndicator`) s'affiche sur l'accueil à partir des tokens cumulés dans `ia_usage`.
- Coût réel observé : **~0,7 à 2 € / an / enseignante**.

### 5.5 Ce que l'IA ne fait PAS / limites

- L'IA **n'invente jamais** de contenu absent du document (règle d'exhaustivité).
- La progression est **toujours plafonnée à 36 semaines** et renumérotée proprement.
- L'import et le chat **ne touchent pas** au suivi des élèves ni aux journaux (non destructifs).
- Pas de réflexion étendue (`thinking`) ni d'Opus (contraintes de temps serverless Vercel).

---

## 6. Récapitulatif des fichiers IA importants

```
src/lib/ia/
  anthropic.ts   → client + constantes de modèle (MODELE_IMPORT / MODELE_CHAT)
  schema.ts      → schéma JSON progression + normalizeProgression (tri, max 36, renumérotation)
  prompts.ts     → tous les prompts système/utilisateur (import, chat, bilan, journal)
  pdf-client.ts  → extraction texte PDF côté navigateur (contourne la limite 4,5 Mo de Vercel)
  erreurs.ts     → messageErreurIA (crédit épuisé, clé manquante…)
  cout.ts        → estimation du coût en euros + plafond

src/app/api/
  ia-manuel/route.ts   → import d'un manuel
  ia-chat/route.ts     → correction conversationnelle (prompt caching)
  ia-bilan/route.ts    → bilan d'élève (placeholder [ELEVE], RGPD)
  ia-journal/route.ts  → amorce du cahier journal

src/lib/actions/
  ia-usage.ts          → enregistrerUsageIA (table ia_usage)
  progression-ia.ts    → corrigerProgression (sauvegarde non destructive)
```

---

## 7. Toutes les fonctions de l'appli (Server Actions + helpers)

Les écritures en base passent par des **Server Actions** Next.js (`'use server'`, dans `src/lib/actions/`). Chacune vérifie l'utilisateur connecté, agit sur SA classe (la plus récente), puis `revalidatePath()` rafraîchit les pages concernées.

### 7.1 Configuration de la classe — `setup.ts`
- **`creerClasse({ manuelId, rentreeDate, eleves, emploiDuTemps, customProgression })`** : crée la classe. Étapes : (1) supprime d'abord toute classe existante de l'utilisateur (anti-doublon) ; (2) insère la classe ; (3) insère les élèves (démarrage possible sans élève) ; (4) génère les 36 `semaines` (dates calculées depuis la rentrée) ; (5) peuple la table `progression` pour le français ; (6) insère l'emploi du temps (ou la trame CP par défaut `TRAME_EDT_CP` si vide). Redirige vers `/accueil`.

### 7.2 Paramètres — `parametres.ts`
- **`updatePrenomEnseignant(prenom)`** : enregistre le prénom (« Bonjour Cécile » + salut de l'IA).
- **`updateEleves(prenoms[])`** : met à jour la liste **en préservant le suivi** — identité par prénom : garde les conservés (et leurs acquisitions), insère les nouveaux, supprime les retirés (+ leurs acquisitions), puis réordonne.
- **`updateEmploiDuTemps(creneaux[])`** : remplace l'EDT (delete + insert). **Sans impact** sur la progression ni les journaux déjà générés.
- **`rechargerEmploiDuTempsType()`** : réinitialise l'EDT sur la trame CP par défaut.
- **`updateRentreeDate(newDate)`** : change la date de rentrée et **recalcule la date de chaque semaine** sans supprimer les semaines (préserve suivi + journaux).
- **`updateManuel(manuelId, customProgression?)`** : ⚠️ **DESTRUCTIF** — supprime acquisitions + cahiers journaux + semaines, puis régénère toute la progression annuelle (ne remplace que le français dans `progression`, préserve le maths importé).
- **`reinitialiserConfiguration()`** : ⚠️ **IRRÉVERSIBLE** — supprime la classe et TOUTES ses données, puis redirige vers `/setup`.

### 7.3 Suivi des élèves — `semaine.ts` & `appreciation.ts`
- **`toggleAcquisition(semaineId, eleveId, matiere, grapheme, acquis)`** : coche/décoche un item (son/notion) pour un élève (upsert sur `acquisitions`, clé unique `semaine_id+eleve_id+matiere+grapheme`). C'est le clic sur une étoile ★/☆.
- **`updateNote(semaineId, note)`** : enregistre une note libre sur la semaine.
- **`upsertAppreciation(semaineId, eleveId, matiere, statut, commentaire)`** : enregistre le **bilan** (statut « acquis » / « pas encore ») + le **commentaire libre** d'un élève pour une semaine/matière.

### 7.4 Progression — `progression-matiere.ts` & `progression-ia.ts`
- **`enregistrerProgressionMatiere(matiere, semaines[])`** : enregistre la progression d'**UNE matière**, en remplaçant **uniquement** les lignes de cette matière (jamais l'autre). Utilisé par l'import IA. Non destructif sur les dates/suivi/journaux.
- **`corrigerProgression(classId, progression[])`** : met à jour **uniquement** items/pages/mots de chaque semaine (par numéro), **sans rien détruire** (vérifie que la classe appartient à l'utilisateur). C'est ce qui sauvegarde la correction conversationnelle IA. À l'inverse de `updateManuel`.

### 7.5 Cahier journal — `journal.ts`
- **`genererOuChargerJournal(semaineId)`** : si un journal existe déjà, le renvoie ; sinon le **génère** depuis l'EDT + la `progression` de la semaine (via `genererCahierJournal`) et le sauvegarde.
- **`sauvegarderJournal(semaineId, contenu)`** : enregistre le contenu édité du cahier journal (upsert).

### 7.6 Démo & usage IA
- **`chargerClasseDemo()`** (`demo.ts`) : crée une classe d'exemple **entièrement pré-remplie** (10 élèves, EDT complet, 36 semaines avec Lecture Piano, rentrée placée ~11 semaines avant aujourd'hui, suivi pré-coché aléatoirement : ~50 % semaine en cours, ~85 % semaines passées) → tout fonctionne « en vrai » pour une démonstration/formation.
- **`enregistrerUsageIA(input, output)`** (`ia-usage.ts`) : journalise les tokens d'un appel IA (best-effort, n'interrompt jamais la réponse).
- **`usageMoisCourant()`** : somme les tokens du mois courant → alimente la jauge de budget.

### 7.7 Helpers (logique pure, sans base)
- **`genererProgression(manuelId, rentreeDate, customProgression?)`** (`progression.ts`) : construit les 36 semaines (dates + graphèmes + thème « Explorer le monde » via `EDM_PROGRESSION_CP`).
- **`genererProgressionFrancais(...)`** : version pour la table `progression` (items/pages/mots, max 36).
- **`genererCahierJournal(emploiDuTemps, progression)`** (`cahier-journal.ts`) : regroupe les créneaux par jour (lundi→vendredi), les trie, et pré-remplit le déroulement des créneaux « cours » à partir de la progression (lecture/maths) ; les créneaux « routine » restent vides. `matiereMethode()` mappe un libellé de créneau vers `'francais'`/`'maths'`.
- **`getStatus(semaine)`** & **`semaineEnCours(semaines)`** (`semaines.ts`) : statut d'une semaine (`done`/`current`/`upcoming`) et sélection de la semaine active.
- **`supprimerClassesUtilisateur(supabase, userId)`** (`reset-classe.ts`) : supprime toutes les classes + données dépendantes (idempotent, évite l'accumulation).
- **`imprimerPage()` / `imprimerElement(el)`** (`print.ts`) : impression de toute la page ou d'un seul bloc (CSS `@media print`).
- **`genererBlobWord()` / `exporterJournalWord()`** (`export-word.ts`) : export du cahier journal en `.docx`.
- **`lancerConfettis()`** (`confetti.ts`) : animation quand un élève valide le dernier item de la semaine.

### 7.8 Composants UI notables
- **`StudentTracking` / `StudentListEditor`** : tableau de suivi (étoiles, bilan, commentaire) + bouton « ✨ Bilan IA » par élève.
- **`ProgressionCorrector`** : chat « 🤖 Corriger la progression » (Planning + Accueil), non destructif.
- **`IaImport`** (dans `ManualSelector`) : import IA d'un manuel (tableau éditable + boîte de dialogue).
- **`CahierJournalEditor`** : édition du journal + bouton « ✨ Générer la journée », export Word/PDF, `GoogleDocsButton` (OAuth Drive).
- **`WeekCard`**, **`ProgressBar`**, **`BudgetIaIndicator`**, **`HeaderNav`** (menu adaptatif selon `hasClass`), **`DemoButton`**, **`ResetButton`**, **`LogoutButton`**, **`PrintButton`**, **`EmploiDuTempsEditor`**, **`RentreeEditor`**, **`PrenomEnseignantEditor`**.

---

## 8. Points d'attention / pièges connus

- **Next.js 16** : APIs et conventions peuvent différer ; protection via `proxy.ts` et non `middleware.ts`.
- **RGPD** : aucun prénom d'élève n'est envoyé à l'IA (placeholder `[ELEVE]` côté serveur, substitution côté navigateur).
- **Limite Vercel ~4,5 Mo** de corps de requête → PDF extrait dans le navigateur.
- **Clé `ANTHROPIC_API_KEY`** : secrète, à définir en local (`.env.local`) ET sur Vercel, puis redéployer.
- **Toute évolution de schéma** passe par une migration versionnée Supabase (la migration `006_schema_complet_idempotent.sql` est la source de vérité du schéma).
```
