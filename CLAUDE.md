@AGENTS.md

# Ma Progression CP — État du projet

## Infos critiques
- **GitHub** : `christopheMia/ma-progression-cp` (PAS christophe-mialon — mauvais username)
- **Vercel** : https://ma-progression-cp.vercel.app (team: christophemias-projects)
- **Supabase** : projet `odwgkakeepcqbgpsfugl` (odwgkakeepcqbgpsfugl.supabase.co)
- **Edge Function** : `create-user` déployée et active (crée users sans confirmation email)

## Architecture auth
- Connexion : `supabase.auth.signInWithPassword()` directement
- Inscription : appel Edge Function `POST /functions/v1/create-user` avec anon key JWT
  → La Edge Function utilise `SUPABASE_SERVICE_ROLE_KEY` + `email_confirm: true`
- Protection routes : `src/proxy.ts` (Next.js 16 — PAS middleware.ts, supprimé)
  → redirige vers /connexion si non connecté, vers /accueil si déjà connecté
- Landing après connexion/inscription/setup : **/accueil** (tableau de bord)

## Variables d'environnement Vercel (déjà configurées)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## Intégration Google Docs (cahier journal)
- Composant : `src/components/semaine/GoogleDocsButton.tsx` — OAuth navigateur (Google Identity Services, scope `drive.file`), upload du .docx vers Drive avec conversion en Google Doc, puis ouverture
- Variable requise : `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Client ID OAuth Web, PUBLIC — pas un secret). Sans elle, le bouton « 📝 Google Docs » ne s'affiche pas.
- Config Google Cloud : activer Google Drive API, écran de consentement en mode Test (ajouter les emails utilisateurs comme testeurs), créer un ID client OAuth « Application Web », origines JS autorisées = https://ma-progression-cp.vercel.app + http://localhost:3000
- Après ajout de la variable sur Vercel : redéployer pour qu'elle soit prise en compte (NEXT_PUBLIC_* inliné au build)

## État actuel (session 2026-06-14)
- Build : propre ✅ (`npx next build` → Compiled successfully)
- Texte visible sur toutes les pages ✅
- Edge Function `create-user` v2 active ✅
- Compte Cécile : `azylis69@hotmail.fr` ✅
- middleware.ts supprimé (conflictait avec proxy.ts — Next.js 16 utilise proxy.ts)
- `@anthropic-ai/sdk` installé — **décision révisée (2026-06-14) : API Anthropic payante ADOPTÉE** pour l'import IA des manuels (voir section dédiée). L'ancienne règle « pas d'API payante » ne s'applique plus à cette fonctionnalité.
- Code poussé sur GitHub ✅ (commit `c511ebf`)
- push-fix.bat et DEPLOY.md supprimés ✅
- **Bouton déconnexion ajouté** ✅ (`src/components/LogoutButton.tsx` dans le header)
  → corrige « la page de connexion a disparu » : sans déconnexion, le proxy renvoyait
    toujours l'utilisateur connecté vers /planning, impossible de revoir /connexion
- **Lien cassé `/parametres` corrigé** → remplacé par `/planning` dans le header (page parametres inexistante)

## Thème VIOLET (état actuel — révisé session 2026-06-14)
- **Accent violet** (évolution : blanc minimaliste → rose → violet, « plus doux/pro »)
- Fond app : dégradé `from-violet-200 via-purple-100 to-violet-100` ; header **solide** (non transparent) `from-violet-600 to-purple-600`, texte blanc, `sticky`, bien séparé
- Connexion : fond `from-violet-300 via-purple-200 to-fuchsia-200` + cercles décoratifs
- Accent unique **violet-600** ; swap global historique des accents : `blue-*` → `indigo-*` → `rose-*` → `violet-*` dans tout `src`
- **Illustrations** : bandeau d'accueil dégradé violet avec formes SVG + motif 📚🍎✏️ ; cercles déco sur la connexion
- **Bulles d'aide au survol** (`title`) + ligne d'aide sur les tableaux à remplir : suivi des élèves (étoiles) et cahier journal (champs)
- **Panneau « Mes outils »** sur /accueil : boutons **Gemini** + **NotebookLM** (ouverture nouvel onglet), carte violette délimitée avec pastilles dégradées
- **Emploi du temps amélioré** (setup + paramètres) : bouton « + Ajouter ce créneau » bien visible (rose plein), **enchaînement auto des horaires** (le créneau suivant démarre à la fin du précédent), suppression par créneau, génération bloquée tant qu'aucun créneau (helpers `addMinutes`/`diffMinutes` locaux)
- **Menu adaptatif** `src/components/HeaderNav.tsx` (client, `usePathname` pour lien actif) : si pas de classe, n'affiche que « Configurer ma classe » + Aide + Déconnexion → corrige le bug « Accueil/Paramètres ne s'ouvrent pas » (en réalité : redirigeaient vers /setup faute de classe après reset)
- Layout `(app)/layout.tsx` charge la classe et passe `hasClass` à HeaderNav

### Fonctionnalités UX (actuelles)
- **Tableau de bord** : `src/app/(app)/accueil/page.tsx` — landing page (Bonjour + date, semaine en cours, stats : semaine X/36, % graphèmes acquis, nb élèves, raccourcis, panneau « Mes outils »)
- **Planning vivant** : barre de progression annuelle, `WeekCard` recolorée par statut, pastille couleur par période, mini-barre d'avancement par semaine, 🏆 si semaine complète, hover -translate-y
- **Progression motivante** : `src/components/ProgressBar.tsx`, suivi élèves avec **étoiles ★/☆**, progression par élève (x/total + barre), 🏆 si complet
- **Confettis** : `src/lib/confetti.ts` (sans dépendance, keyframe `confetti-fall` dans globals.css) — quand un élève valide le dernier graphème de la semaine
- Helper partagé `src/lib/semaines.ts` (`getStatus`, `semaineEnCours`)
- *(historique couleurs : thème chaleureux dégradé ambre/indigo → rose → violet)*

## Suivi des élèves — bilan + commentaire (par élève/semaine)
- Table Supabase **`appreciations`** (semaine_id, eleve_id, statut, commentaire, unique(semaine_id,eleve_id), RLS identique à acquisitions, FK on delete cascade)
- Action : `src/lib/actions/appreciation.ts` → `upsertAppreciation(semaineId, eleveId, statut, commentaire)` (envoie toujours les 2 champs pour ne pas en écraser un)
- `StudentTracking` : par ligne d'élève → étoiles par graphème (table `acquisitions`) + **Bilan** (boutons « ✓ Acquis » / « Pas encore ») + **Commentaire** libre (save au blur)
- En-têtes clarifiés : graphèmes en badges violets (label « son »), titres en gras
- Rappel : graphème « d » (ex. semaine 13 Lecture Piano) = colonne normale, pas un bug

## Mode d'emploi / Aide (ajouté session 2026-06-14)
- Page : `src/app/(app)/aide/page.tsx` — accessible via ❓ Aide dans le header
- Contenu simple pour Cécile : remplir manuel/CSV, date, élèves, emploi du temps, suivi, journal, impression, paramètres
- Bulles d'aide courtes ajoutées : StudentListEditor + TimetableEditor (setup) et EmploiDuTempsEditor (paramètres)

## Classes en double — corrigé (important)
- Bug historique : `creerClasse` ne faisait que des INSERT → chaque génération créait une classe, et les lectures `.single()` plantaient (boucle de redirection vers /setup, planning jamais affiché).
- Correctifs :
  - Lectures de classe **tolérantes** : `.eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()` (prend la plus récente) dans layout, accueil, planning, parametres, (app)/page, getClasse
  - `src/lib/reset-classe.ts` → `supprimerClassesUtilisateur()` supprime TOUTES les classes + données dépendantes
  - `creerClasse` et `reinitialiserConfiguration` appellent ce helper (idempotent → plus d'accumulation)
- Note : suppression directe en base via MCP bloquée par sécurité ; nettoyage via le bouton « Repartir de zéro ».

## Mode démonstration (formation)
- Action : `src/lib/actions/demo.ts` → `chargerClasseDemo()` : classe d'exemple **entièrement pré-remplie** avec de VRAIES données (10 élèves, emploi du temps, 36 semaines, rentrée placée ~11 semaines avant aujourd'hui, suivi pré-coché) → tout fonctionne réellement
- Bouton : `src/components/DemoButton.tsx` — dans l'assistant `/setup` (sans confirmation) et dans Paramètres (prop `confirmer` → remplace la classe existante)

## Page Paramètres (ajoutée session 2026-06-14)
- Route : `src/app/(app)/parametres/page.tsx` — accessible via ⚙️ Paramètres dans le header
- Actions : `src/lib/actions/parametres.ts`
- Composants : `src/components/parametres/{ElevesEditor,EmploiDuTempsEditor,RentreeEditor,ManuelEditor}.tsx`
- **Élèves** : `updateEleves` — préserve le suivi par prénom (garde / ajoute / supprime), efface les acquisitions des élèves retirés
- **Emploi du temps** : `updateEmploiDuTemps` — delete + insert (sans impact sur progression / journaux déjà générés)
- **Date de rentrée** : `updateRentreeDate` — recalcule `date_debut` de chaque semaine SANS supprimer les semaines (préserve suivi + journaux)
- **Manuel** : `updateManuel` — ⚠️ DESTRUCTIF : supprime acquisitions + cahier_journal + semaines puis régénère ; double confirmation dans l'UI ; réutilise `ManualSelector` (donc import PDF/CSV possible)
- **Repartir de zéro** : `reinitialiserConfiguration` — supprime TOUT (classe + toutes données) puis `redirect('/setup')` ; bouton `ResetButton.tsx` en bas de /parametres (zone rouge, double confirmation)

## Impression (ajoutée session 2026-06-14)
- Helpers : `src/lib/print.ts` → `imprimerPage()` (toute la page) et `imprimerElement(el)` (un seul bloc)
- CSS : `@media print` dans `globals.css` (classe `.no-print` pour masquer les boutons,
  `body.print-isolated` + `.print-target` pour n'imprimer qu'un bloc via visibility)
- Bouton réutilisable : `src/components/PrintButton.tsx` (pour pages serveur)
- **Planning annuel** : bouton 🖨️ + grille forcée 7 colonnes (`print:grid-cols-7`) anti-coupure
- **Fiche semaine complète** : bouton 🖨️ dans l'en-tête de la page semaine (lecture + EDM + suivi + journal)
- **Suivi des élèves** : bouton 🖨️ qui n'imprime que le tableau (StudentTracking)
- **Cahier journal** : le bouton PDF n'imprime que le journal ; export **Word (.docx)** via `src/lib/export-word.ts` (`genererBlobWord` réutilisable + `exporterJournalWord` qui `saveAs`), avec libellé clair + confirmation de téléchargement ; bouton **Google Docs** (voir section dédiée)
- ⚠️ Limite navigateur : un site web ne peut PAS lancer un .exe local ni pousser vers Google Docs sans OAuth (cf. intégration Google Docs)

## Manuels disponibles dans `src/data/manuels/`
| Manuel | Éditeur | Progression |
|--------|---------|-------------|
| Lecture Piano | Retz (2025) | ✅ vérifiée |
| Au CP avec Méli | Lelivrescolaire | ⚠️ NON conforme (à corriger) |

**⚠️ Correction 2026-06-14** : vérification en ligne (site éditeur) → la progression
`au-cp-avec-meli.ts` ne correspond PAS au vrai manuel (officiel : 32 semaines,
2 graphèmes/semaine, 54 études ; fichier : 36 semaines, 1/semaine). L'ancien label
« ✅ vérifiée » était faux. À corriger via l'import IA ou retrait du label.

**Les 6 autres manuels (Calimots, Taoki, Timini, 1.2.3 Lune!, À moi de lire!, Ribambelle) ont été supprimés — leurs progressions étaient approximatives et inventées.**

Pour les autres manuels : import PDF (extraction automatique gratuite via `pdf-parse`) ou import CSV (modèle téléchargeable) dans `src/components/setup/ManualSelector.tsx`.

## Import PDF — fonctionnement
- Route : `src/app/api/parse-manuel-pdf/route.ts`
- Package : `pdf-parse` (gratuit, extraction de texte côté serveur)
- `serverExternalPackages: ['pdf-parse', 'pdfjs-dist']` dans `next.config.ts` (requis pour le build Turbopack)
- Fonctionne uniquement avec PDF numériques (texte sélectionnable), pas les PDF scannés
- Détection par regex des "Semaine N" + graphèmes courants CP
- Si 0 semaines détectées : affiche l'aperçu du texte extrait + suggère le CSV
- ⚠ Résultat approximatif — avertissement affiché à l'enseignant avant confirmation

## Import IA des manuels (IMPLÉMENTÉ — sous-système 1, 2026-06-14)
- Design : `docs/superpowers/specs/2026-06-14-import-ia-manuel-design.md`
  Plan : `docs/superpowers/plans/2026-06-14-import-ia-manuel.md`
- But : l'IA **lit/comprend** le manuel (PDF ou sommaire collé) → progression
  structurée **éditable**, + **chat de correction** personnalisé (boîte de dialogue).
- Fichiers créés :
  - `src/lib/ia/anthropic.ts` (client + `MODELE_IMPORT=claude-opus-4-8`, `MODELE_CHAT=claude-sonnet-4-6`)
  - `src/lib/ia/schema.ts` (schéma JSON imposé + `normalizeProgression`, max 36 semaines)
  - `src/lib/ia/prompts.ts` (`SYSTEM_IMPORT`, `userImport`, `systemChat`)
  - `src/app/api/ia-manuel/route.ts` (Opus, sorties structurées) — PDF (pdf-parse) ou texte
  - `src/app/api/ia-chat/route.ts` (Sonnet, prompt caching, historique borné 10)
  - `src/components/setup/IaImport.tsx` (tableau éditable + boîte de dialogue violette)
  - 3ᵉ onglet « 🤖 Import IA » dans `ManualSelector.tsx` (par défaut)
- `@anthropic-ai/sdk` installé (`^0.104.x`). Tests : `src/lib/ia/__tests__/`.
- **RGPD** : ce sous-système n'envoie AUCUNE donnée élève (seulement sons/semaines/pages).
  L'anonymisation des prénoms concerne le sous-système 2 (bilans élèves, à venir).
- ⚠️ **À FAIRE (utilisateur)** : ajouter `ANTHROPIC_API_KEY` (secrète, PAS `NEXT_PUBLIC_`)
  en local (`.env.local`) ET sur Vercel → redéployer. Sans la clé, les routes renvoient
  une erreur claire (le reste de l'appli fonctionne).
- Console Anthropic : charger des crédits + **plafond mensuel** (garde-fou). Coût ~0,7-2 €/an/enseignante.
- Clé API : fournir via terminal `!` (jamais dans le chat), comme le token GitHub.
- Sous-système 2 (PLANIFIÉ) : tableaux/bilans élèves avec anonymisation `Élève N`.

## Règle token GitHub
Ne jamais coller le token dans le chat — GitHub le révoque automatiquement.
Toujours utiliser le terminal VS Code avec `!` :
```
! git remote set-url origin https://christopheMia:TOKEN@github.com/christopheMia/ma-progression-cp.git
! git push origin main
```

## Token GitHub
- Le token PAT est dans l'URL remote git
- Il expire ou est révoqué si exposé dans un log/chat
- **Procédure renouvellement** : github.com → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (scope: repo)
- Puis : `git remote set-url origin https://christopheMia:TOKEN@github.com/christopheMia/ma-progression-cp.git`

## Corrections UI déjà appliquées
- Texte noir (text-gray-900 bg-white) sur tous les inputs/selects
- Bouton ← Étape précédente dans le wizard de configuration
- Indicateur ✓ Sauvegardé dans CahierJournalEditor et StudentTracking

## À faire prochaine session
1. **Configurer Google Docs** — créer le Client ID OAuth (Google Cloud) + ajouter `NEXT_PUBLIC_GOOGLE_CLIENT_ID` sur Vercel et redéployer (cf. section Intégration Google Docs). Sans ça, bouton 📝 masqué.

2. **Page "Mot de passe oublié"** — `supabase.auth.resetPasswordForEmail()` + page `/reset-password`

3. **Tester le mode démo** — Paramètres → 🎓 charger la démo → vérifier planning vivant, suivi, stats, impression, export Word

4. **Tester l'import PDF** — avec un vrai manuel numérique CP pour vérifier la détection des semaines

5. **Tester l'impression** — chaque bouton 🖨️ (planning, fiche semaine, suivi, cahier journal)

6. **Tester Paramètres** — modifier élèves / emploi du temps / date et vérifier que le suivi est préservé ; changement de manuel (destructif, confirmation)
