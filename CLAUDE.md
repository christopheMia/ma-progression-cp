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
  → redirige vers /connexion si non connecté, vers /planning si déjà connecté

## Variables d'environnement Vercel (déjà configurées)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## État actuel (session 2026-06-14)
- Build : propre ✅ (`npx next build` → Compiled successfully)
- Texte visible sur toutes les pages ✅
- Edge Function `create-user` v2 active ✅
- Compte Cécile : `azylis69@hotmail.fr` ✅
- middleware.ts supprimé (conflictait avec proxy.ts — Next.js 16 utilise proxy.ts)
- `@anthropic-ai/sdk` installé mais non utilisé (décision : pas d'API payante)
- Code poussé sur GitHub ✅ (commit `c511ebf`)
- push-fix.bat et DEPLOY.md supprimés ✅
- **Bouton déconnexion ajouté** ✅ (`src/components/LogoutButton.tsx` dans le header)
  → corrige « la page de connexion a disparu » : sans déconnexion, le proxy renvoyait
    toujours l'utilisateur connecté vers /planning, impossible de revoir /connexion
- **Lien cassé `/parametres` corrigé** → remplacé par `/planning` dans le header (page parametres inexistante)

## Thème minimaliste moderne (révisé session 2026-06-14)
- **Refonte vers minimaliste** (après retour : dégradé pas joli) : fond `bg-slate-50`, header **blanc** `sticky` + `border-b border-slate-200` (plus de dégradé), accent unique **indigo-600**, cartes `border-slate-200`
- Swap global `blue-*` → `indigo-*` dans tout `src` pour unifier l'accent
- **Menu adaptatif** `src/components/HeaderNav.tsx` (client, `usePathname` pour lien actif) : si pas de classe, n'affiche que « Configurer ma classe » + Aide + Déconnexion → corrige le bug « Accueil/Paramètres ne s'ouvrent pas » (en réalité : redirigeaient vers /setup faute de classe après reset)
- Layout `(app)/layout.tsx` charge la classe et passe `hasClass` à HeaderNav

### (historique) 1re version — thème chaleureux (remplacée)
- header en dégradé indigo→violet→purple, fond `from-amber-50 via-rose-50`, page connexion en dégradé + titre `bg-clip-text`
- **Tableau de bord** : `src/app/(app)/accueil/page.tsx` — nouvelle landing page (Bonjour + date, semaine en cours, stats : semaine X/36, % graphèmes acquis, nb élèves, raccourcis). Redirections après connexion/inscription/setup → `/accueil` (proxy.ts + connexion + (app)/page.tsx + setup.ts)
- **Planning vivant** : barre de progression annuelle, `WeekCard` recolorée par statut (done=emerald, current=amber ring, upcoming), pastille couleur par période, mini-barre d'avancement par semaine, 🏆 si semaine complète, hover -translate-y
- **Progression motivante** : `src/components/ProgressBar.tsx`, suivi élèves avec **étoiles ★/☆** (au lieu de cases), progression par élève (x/total + barre), 🏆 si complet
- **Confettis** : `src/lib/confetti.ts` (sans dépendance, DOM + keyframe `confetti-fall` dans globals.css) — déclenché quand un élève valide le dernier graphème de la semaine
- Helper partagé `src/lib/semaines.ts` (`getStatus`, `semaineEnCours`)

## Mode d'emploi / Aide (ajouté session 2026-06-14)
- Page : `src/app/(app)/aide/page.tsx` — accessible via ❓ Aide dans le header
- Contenu simple pour Cécile : remplir manuel/CSV, date, élèves, emploi du temps, suivi, journal, impression, paramètres
- Bulles d'aide courtes ajoutées : StudentListEditor + TimetableEditor (setup) et EmploiDuTempsEditor (paramètres)

## Page Paramètres (ajoutée session 2026-06-14)
- Route : `src/app/(app)/parametres/page.tsx` — accessible via ⚙️ Paramètres dans le header
- Actions : `src/lib/actions/parametres.ts` (⚠️ `creerClasse` ne fait que des INSERT — ne PAS y renvoyer, ça duplique la classe)
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
- **Cahier journal** : le bouton PDF n'imprime plus que le journal (avant : toute la page) — export Word inchangé

## Manuels disponibles — 2 manuels vérifiés dans `src/data/manuels/`
| Manuel | Éditeur | Progression |
|--------|---------|-------------|
| Lecture Piano | Retz (2025) | ✅ vérifiée |
| Au CP avec Méli | Lelivrescolaire | ✅ vérifiée |

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
1. **Page "Mot de passe oublié"** — `supabase.auth.resetPasswordForEmail()` + page `/reset-password`

2. **Tester le planning** — vérifier que Cécile voit son tableau de bord après connexion

3. **Tester l'import PDF** — essayer avec un vrai manuel numérique CP pour vérifier la détection des semaines

4. **Tester le rendu d'impression** — avec le compte Cécile, cliquer chaque bouton 🖨️
   (planning, fiche semaine, suivi élèves, cahier journal) et vérifier l'aperçu avant impression

5. **Tester la page Paramètres** — modifier élèves / emploi du temps / date de rentrée et vérifier
   que le suivi est préservé ; tester le changement de manuel (destructif, avec confirmation)
