# État d'exécution — 2026-06-17 (reprise après session)

> Fichier de reprise écrit en cours d'exécution (risque d'épuisement de tokens). Branche : `feat/multi-methodes`.

## Contexte

Deux chantiers conçus aujourd'hui, specs + plans **commités** :
- **Multi-méthodes** (Français + Maths sans écrasement) : spec `docs/superpowers/specs/2026-06-16-multi-methodes-design.md`, plan `docs/superpowers/plans/2026-06-16-multi-methodes.md` (14 tâches, 4 phases). **PAS encore implémenté.**
- **Emploi du temps grille + cahier journal IA + garde-fou crédit** : spec `docs/superpowers/specs/2026-06-17-emploi-du-temps-journal-design.md`, plan `docs/superpowers/plans/2026-06-17-emploi-du-temps-journal.md` (10 tâches, 3 phases A/B/C). **En cours d'implémentation (Phase A).**

Exécution via **subagent-driven-development** (1 sous-agent implémenteur par tâche + revue spec + revue qualité), en restant sur la branche `feat/multi-methodes` (pas de worktree séparé).

**Dépendance clé** : la **Phase B (cahier journal)** lit la table `progression` créée par le chantier multi-méthodes. Ordre prévu : Phase A (EDT, indépendante) → multi-méthodes → Phases B + C.

## Avancement (plan EDT/journal)

### ✅ Task 1 — Migration `005` (couleur, type) + type `CreneauHoraire`
- Commits : `59a64f2` (migration + type), `1990722` (fixtures test verts), `83371a6` (`if not exists`).
- Revue spec ✅ + revue qualité ✅. Numérotation `005` voulue (003/004 réservés à multi-méthodes — NE PAS renommer).

### ✅ Task 2 — `src/data/trame-edt.ts` (TRAME_EDT_CP + couleurMatiere)
- Commits : `e47f83c` (TDD), `0916f7e` (union discriminée + test longueur 72).
- Revue spec ✅ + revue qualité ✅. 72 créneaux (18 tranches × 4 jours, pas de mercredi). Tests 6/6.

### ✅ Task 3 — Pré-remplissage EDT au setup + `rechargerEmploiDuTempsType`
- Commits : `cdbee8a` (logique), `5e621d8` (import statique + guard insert).
- Revue spec ✅ + revue qualité ✅ (`src/lib/actions/setup.ts`, `src/lib/actions/parametres.ts`).

### ⏳ Task 4 — Éditeur grille `TimetableGrid` (remplace les 2 éditeurs liste)
- **Implémentée + commitée `3714962`. Build `npx next build` = Compiled successfully.**
- **RESTE À FAIRE : revue spec + revue qualité** (non faites avant l'écriture de ce fichier).
- Fichiers : créés `src/components/TimetableGrid.tsx`, `src/components/parametres/EmploiDuTempsGrille.tsx` ; supprimés `src/components/setup/TimetableEditor.tsx`, `src/components/parametres/EmploiDuTempsEditor.tsx` ; modifiés `src/app/(app)/setup/page.tsx`, `src/app/(app)/parametres/page.tsx`, `src/lib/actions/setup.ts` (signature `emploiDuTemps` élargie à `couleur?`/`type?`, branche « EDT fourni » préserve `c.couleur`/`c.type`).
- Points à vérifier en revue : la grille du setup préserve bien les couleurs jusqu'en base ; la page paramètres charge bien `couleur`/`type` existants ; pas de régression d'impression couleur.

## ACTIONS À FAIRE (dans l'ordre)

1. **Finir Task 4** : revue spec (lire `git show 3714962`, vérifier conformité au plan Task 4) + revue qualité (`git diff 5e621d8 3714962`). Corriger si besoin. → **Phase A terminée et déployable.**
2. **Tester/valider Phase A en local** (optionnel) : `npm test` (doit être vert) + `npm run dev` → /setup grille pré-remplie, /parametres édition couleurs + routine + recharger.
3. **Décider l'ordre de la suite** : recommandé = implémenter le **plan multi-méthodes** (`2026-06-16-multi-methodes.md`, Tasks 1→14) AVANT la Phase B. Sinon, faire Phase C (crédit, indépendante) puis B après multi-méthodes.
4. **Phase B du plan EDT/journal (Tasks 5-8)** : format journal 3 colonnes, `genererCahierJournal(edt, progression)`, route `api/ia-journal`, bouton « ✨ Générer la journée ». **NÉCESSITE la table `progression`** (multi-méthodes).
5. **Phase C (Tasks 9-10)** : `messageErreurIA` (épuisement crédit) dans toutes les routes IA ; jauge budget estimée (`ia_usage` migration `006`, `estimerCoutEuros`, `BudgetIaIndicator` sur l'accueil). Indépendante — peut se faire à tout moment.

## Migrations à appliquer EN PROD (MCP Supabase / dashboard) — quand le code est en ligne

- `003_multi_methodes.sql` (table `progression` + colonne `matiere`) — AVANT déploiement du code multi-méthodes.
- `004_semaines_cleanup.sql` — APRÈS bascule du code multi-méthodes.
- `005_emploi_du_temps_grille.sql` (couleur, type) — avec le déploiement Phase A.
- `006_ia_usage.sql` (jauge crédit) — avec le déploiement Phase C.

## Rappels techniques

- Modèle IA = `claude-sonnet-4-6` partout (jamais Opus : timeout Vercel). Journal généré **par journée**.
- `git` config : avertissements CRLF/LF normaux sous Windows, sans impact.
- Numérotation migrations : 001/002 existantes ; 003/004 = multi-méthodes ; 005/006 = ce chantier.
- Reprise : relancer subagent-driven-development à la Task 4 (revues) puis enchaîner.
