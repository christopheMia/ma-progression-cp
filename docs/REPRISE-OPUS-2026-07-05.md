# 📌 REPRISE POUR OPUS — État complet du projet au 2026-07-05

> Document d'orchestration écrit le **2026-07-05** (session Fable « chef d'orchestre »).
> **À lire en entier avant toute action.** Il remplace `REPRISE-SESSION-COMMERCIALISATION.md`
> comme point d'entrée (ce dernier reste valable pour le détail business).
>
> Compléments à lire ensuite : `EXPLICATION-APPLI.md` (fonctionnement complet de l'appli),
> `docs/STRATEGIE-N1-MARCHE.md`, `docs/ETUDE-CONCURRENTIELLE-CROISEE-2026-06-26.md`,
> `docs/PLAN-DISTRIBUTION.md`, `BRIEF-LANDING-OFFRES.md`.

---

## ⭐ LE CAP (exigence de Christophe, 2026-07-05)

> « Je veux la **meilleure** application : **fiable, sécurisée, RGPD**, avec une **expérience
> utilisateur complète, jolie, accessible et intuitive**. »

Toute décision se juge à cette aune, dans cet ordre de priorité :
1. **Fiable** — pas de perte de données, migrations propres, tests, prod qui tient (cf. §0 et §4).
2. **Sécurisée** — auth partout, quotas, RLS ; les trous du §4 se corrigent AVANT les nouveautés.
3. **RGPD** — les prénoms d'élèves ne partent JAMAIS vers l'IA ; chaque nouveau module respecte ça dès sa conception.
4. **UX complète, jolie, accessible, intuitive** — pensée pour une enseignante non technicienne :
   libellés simples, aide contextuelle, contrastes/tailles lisibles, navigation évidente,
   design soigné (utiliser le skill `frontend-design` pour toute nouvelle interface,
   et prévoir une passe accessibilité : contrastes, focus clavier, labels de formulaires).

---

## 🚨 0. URGENT — Supabase est EN PAUSE

Vérifié le 2026-07-05 : le projet Supabase `odwgkakeepcqbgpsfugl` a le statut **INACTIVE**
(mise en pause automatique du plan gratuit après ~1 semaine sans activité).
**Conséquence : l'appli en prod ne fonctionne plus du tout pour Cécile** (ni connexion, ni données).

- **Action : Christophe clique « Restore project »** sur https://supabase.com/dashboard
  (ou demande explicitement à l'IA de le faire via MCP `restore_project`). Les données sont conservées.
- **À retenir pour la beta** : tant qu'on est sur le plan gratuit, le projet se met en pause
  dès que personne ne l'utilise ~1 semaine. Options : passer au plan payant au lancement de la beta,
  ou accepter de le réactiver à la main. À trancher avant d'inviter des testeuses.

---

## 1. OÙ ON EN EST (état vérifié le 2026-07-05)

### Branche en cours : `feat/methodes-par-matiere`
- **20 commits d'avance sur `main`**, tout est **poussé** sur GitHub (PR #1 ouverte vers main).
- **Vérifié aujourd'hui : build propre ✅ et 44 tests Jest OK ✅** (commande : `npm test` — c'est **Jest**, pas Vitest).
- Contenu : la fonction **« méthodes par matière »** (Plans 1+2 exécutés) :
  table `methodes` (migration `008`), `methode_id` partout, `MethodesEditor` dynamique,
  matière libre dans l'import IA, `MatiereBlock` générique, `visible_journal` par créneau,
  suppression de `matieres.ts` (plus de liste en dur).
- **Ce qui bloque le merge** : test manuel avec Cécile jamais fait (et la prod est en pause…).

### Chantiers ouverts (non codés ou en pause)
| Chantier | État | Où |
|---|---|---|
| Refonte assistant `/setup` multi-méthodes | ⏸️ **EN PAUSE — attend que Cécile donne l'ordre des étapes** | spec `docs/superpowers/specs/2026-06-26-assistant-multi-methodes-design.md` |
| Landing « fil de l'année » | Brouillon `landing/index-v2.html` fait ; **le brief de corrections n'est PAS appliqué** | `BRIEF-LANDING-OFFRES.md` (voir §3) |
| Stripe + quota par cliente | Décidé, pas commencé | `REPRISE-SESSION-COMMERCIALISATION.md` §2 |
| Séances détaillées (fiche de prép) | À concevoir après méthodes par matière | idem §5 |
| Sauvegarde Cécile + projet Supabase de TEST | ⚠️ **Toujours pas fait** (c'était le bloqueur « Task 0 ») | mémoire + §4 ici |

### Dette technique connue
- Colonnes legacy `graphemes` / `manuel_pages` / `mots_exemple` encore sur `semaines`
  (NOT NULL, migration de suppression `004` jamais écrite ; lues en repli si `progression` vide).
- Toute évolution de schéma = migration versionnée ; `006_schema_complet_idempotent.sql` = source de vérité.

---

## 2. NOUVEAUX BESOINS DE CÉCILE (documents `news/` du 2026-07-05, analysés)

Quatre documents déposés dans `news/` → à transformer en fonctionnalités. **Ce sont des demandes
terrain réelles**, et elles recoupent les modules des concurrents (Teetsh a déjà un module 108h).

### 2.1 `108 heures.pdf` → module « APC / 108 heures » 🆕
Les enseignants doivent 108 h hors classe : 6 h conseils d'école + 36 h APC + 18 h formation
+ 48 h travail d'équipe (équipe éducative, conseils de cycle, RDV parents, préparation APC…).
Demande de Cécile :
1. **Récapitulatif APC** : savoir vite **quel élève** a eu des APC, **à quelle date**,
   **quelles compétences travaillées** et **le résultat** pour l'élève.
2. **Calcul automatique des heures** par catégorie (où en suis-je sur mes 108 h ?).
→ Nouveau module : une table `apc_seances` (élève(s), date, durée, compétence, résultat)
  + une table ou catégorisation des autres heures (conseil, formation, équipe) + un compteur/jauge.
  Passer par brainstorming → spec avant de coder.

### 2.2 `exemple lsu.pdf` → format cible du chantier « LSU / compétences officielles » 🆕
C'est un **vrai livret LSU** : tableau par **domaine d'enseignement** → « principaux éléments du
programme travaillés durant la période » → **positionnement en 4 niveaux**
(Non atteints / Partiellement atteints / Atteints / Dépassés).
- Ça rejoint le constat du commit `6a809cd` : l'appli n'est pas alignée sur les compétences
  officielles du B.O. — c'est LE chantier « LSU » identifié comme table-stakes face à
  Edumoov/PrimSchool (habilités LSU).
- Piste : le suivi actuel (étoiles par item de la méthode) devra pouvoir se **traduire/exporter**
  dans ce format (domaine + éléments travaillés + positionnement 4 niveaux) pour pré-remplir le LSU.
- Ce PDF sert de **modèle de rendu** : le garder comme référence de design.

### 2.3 `note option.pdf` → mise en forme de l'emploi du temps (confort) 🆕
Demande : pouvoir choisir **couleur de fond ET couleur d'écriture**, **surligner**, **gras**,
**souligné**, et si possible des **polices**, dans l'édition de l'EDT « ou autres ».
- L'EDT a déjà une couleur par créneau (migration `005`) → étendre : couleur du texte,
  styles (gras/souligné/surlignage), éventuellement choix de police.
- Priorité plus faible que APC/LSU, mais peu coûteux et très visible pour l'utilisatrice.

### 2.4 `programme-progression-programmation.pdf` → vocabulaire de référence 📖
Document pédagogique (P. Gourdet) qui distingue :
- **Programme** = la liste officielle des notions (sans ordre) ;
- **Progression** = l'ordre des apprentissages choisi par l'enseignant ;
- **Programmation** = le placement dans le calendrier (semaines, vacances).
→ Pas une fonctionnalité, mais un **cadrage** : notre appli fait la *progression* (import IA du
manuel) **et** la *programmation* (36 semaines calées sur la rentrée). Utiliser ces mots **justes**
dans l'interface, la landing et les prompts IA — c'est un signal de crédibilité pour les enseignants.
Le lien avec le *programme* officiel = précisément le chantier LSU du §2.2.

---

## 3. LANDING — brief à appliquer (`BRIEF-LANDING-OFFRES.md`)

À appliquer sur `landing/index-v2.html` (l'ancienne `index.html` reste intacte) :
- Retirer les claims prématurés (badge « préféré des maîtresses », « rejoignez les enseignants… », « De la PS au CM2 »).
- **Supprimer le plan gratuit permanent** → **essai gratuit 30 jours** (bandeau, sans CB).
- Plan Classe 4 €/mois (50 générations IA) = cible de conversion ; Plan Confort 7 €/mois =
  **IA illimitée** + éventuellement **multi-classes** (⚠️ vérifier d'abord que l'architecture le
  permet — aujourd'hui les lectures prennent LA classe la plus récente : `maybeSingle()` → c'est
  du travail, pas juste un switch).
- Offre de lancement −50 % / 3 mois avec date limite à fixer.
- Ne PAS toucher : FAQ, mock animé, témoignage Cécile, mentions RGPD/Stripe.

---

## 4. 🔐 SÉCURITÉ — audit du 2026-07-05

### 🔴 Bloquant avant TOUT lancement public
1. **Les 4 routes IA ne vérifient PAS que l'utilisateur est connecté**
   (`src/app/api/ia-manuel`, `ia-chat`, `ia-bilan`, `ia-journal` — vérifié : aucun
   `getUser`/`createClient` dans `src/app/api`). En clair : **n'importe qui sur internet qui
   trouve l'adresse peut faire tourner l'IA et vider le budget Anthropic** (seule protection
   actuelle = plafond ~8 € de la carte). 
   → **Correctif à faire en premier** : au début de chaque route, vérifier la session Supabase
   (client SSR + `auth.getUser()`, refuser en 401 sinon). C'est AUSSI le prérequis technique du
   **quota par cliente** (il faut savoir QUI appelle pour compter par personne).
2. **Quota IA par cliente inexistant** : `ia_usage` compte globalement, aucune limite par compte.
   À faire avec/après le correctif n°1 (et avant Stripe).

### 🟠 Avant d'inviter des testeuses
3. **Edge Function `create-user` ouverte** : n'importe qui avec l'anon key (visible dans le
   navigateur) peut créer des comptes en masse. Prévoir au minimum un rate-limit ou un captcha,
   ou une liste d'invitation pendant la beta.
4. **Sauvegarde + environnement de test** (toujours pas fait) : `pg_dump` des données de Cécile
   + **2ᵉ projet Supabase gratuit de TEST** pour développer sans risque (la prod a déjà été
   perdue une fois — cf. mémoire `project_schema_prod_drift`).
5. **Activer la protection « mot de passe compromis » (HIBP)** dans Supabase Auth
   (seul warning de l'advisor sécurité du 2026-06-25 ; la RLS avait été vérifiée OK ✅).
   Relancer `get_advisors` après la réactivation du projet (des migrations sont passées depuis).

### 🟡 À garder en tête
6. **Supabase en pause automatique** (voir §0) — fiabilité de la prod pendant la beta.
7. Page « mot de passe oublié » toujours manquante (`resetPasswordForEmail`) — autant une
   fonctionnalité qu'un sujet de support/sécurité.
8. RGPD : les acquis (prénoms jamais envoyés à l'IA, placeholder `[ELEVE]`) sont un argument
   commercial — **ne jamais régresser** là-dessus dans les nouveaux modules (APC = données
   élèves sensibles : mêmes règles, prénom jamais envoyé).

---

## 5. 🗺️ ORDRE DE REPRISE RECOMMANDÉ (pour Opus)

1. **Réactiver Supabase** (Christophe, bouton Restore) + vérifier que l'appli remarche en prod.
2. **Sécuriser les 4 routes IA** (auth obligatoire) — petit chantier, gros risque évité. Tests + deploy.
3. **Sauvegarde Cécile + projet Supabase de TEST** (bloqueur historique, à faire une bonne fois).
4. **Faire tester la branche `feat/methodes-par-matiere` à Cécile → merger la PR #1.**
   Ne pas empiler plus de travail sur cette branche.
5. **Assistant `/setup`** : relancer Cécile pour l'ordre des étapes, puis exécuter la spec en pause.
6. **Landing** : appliquer `BRIEF-LANDING-OFFRES.md` sur `index-v2.html`.
7. **Stripe + quota par cliente** (essai 30 j → Classe 4 € → Confort 7 €), en s'appuyant sur l'auth du point 2.
8. **Nouveaux modules Cécile** (brainstorming → spec → plan pour chacun) :
   a. **APC / 108 heures** (§2.1) — demande explicite + parité Teetsh.
   b. **LSU / compétences officielles** (§2.2) — table-stakes du marché, gros chantier.
   c. **Mise en forme EDT** (§2.3) — rapide, plaisir utilisatrice.
9. **Séances détaillées** (fiche de prép, générée une par une) — produit d'appel de l'abonnement.

## 5 bis. PETITES FINITIONS REPÉRÉES (vite faites, grosse valeur perçue)
- **Titre d'onglet = « Create Next App »** (constaté le 2026-07-05 sur /connexion) : mettre le vrai
  nom de l'appli + description dans les `metadata` du layout racine. 1 ligne, à glisser dans le
  prochain lot de code (ex. avec la sécurisation des routes IA).
- Pack essai Cécile prêt (2026-07-05) : `GUIDE-ESSAI-CECILE.pdf` (racine, NON commité — contient
  un mot de passe), compte `essai.methodes@aufildelannee.fr`, sauvegarde in-DB `sauvegarde_20260705`,
  lien preview débloqué (protection Vercel désactivée — à RÉACTIVER après la phase de test).
- **MAJ 2026-07-05 (soir)** : guide **enrichi et PDF régénéré** — nouvelle section
  « 🧩 Pour préparer la suite » qui demande à Cécile (a) l'**ordre des étapes de l'assistant**
  `/setup` (débloque le chantier en pause §1) et (b) le **classement de ses 3 demandes**
  (APC/108h, livret LSU, mise en forme EDT — priorise le §2). Source HTML = `GUIDE-ESSAI-CECILE.html`
  (racine ; `GUIDE-ESSAI-CECILE.*` ajouté au `.gitignore`, jamais commité). Régénération :
  chromium headless de ms-playwright (`chrome.exe --headless --print-to-pdf`), vérifié via pdf-parse.
  **Reste à faire par Christophe : vérifier que le lien d'essai s'ouvre, puis envoyer le PDF à Cécile.**
- **Question ouverte (2026-07-05 soir)** : les boutons **Gemini + NotebookLM** du panneau
  « Mes outils » (`src/app/(app)/accueil/page.tsx`) sont toujours là ; la stratégie prévoit de les
  remplacer par les fonctions IA internes. Décision à prendre à la reprise : les retirer simplement,
  ou les remplacer par des raccourcis vers « Corriger la progression » / « Générer la journée ».
  Recommandation donnée : retirer avant le test de Cécile (5 min, cohérent avec « l'IA est dedans »).

## 6. MÉTHODE DE TRAVAIL (rappels non négociables)
- **Christophe n'est pas développeur** : expliquer sans jargon, en termes d'usage pour l'enseignante.
  Poser les questions en texte conversationnel (il n'aime pas les popups de choix).
- Skills superpowers : **brainstorming → spec → writing-plans → exécution** pour toute nouvelle fonction.
- **Jamais** de changement de schéma hors migration versionnée (`supabase/migrations/`).
- Vérifier la disponibilité (concurrents + domaine) **avant** de proposer un nom.
- Tests = `npm test` (Jest, 44 tests). Build = `npx next build`. Next.js 16 → lire
  `node_modules/next/dist/docs/` en cas de doute (proxy.ts, pas middleware).
- Jamais de token/clé API dans le chat (terminal `!` uniquement).
