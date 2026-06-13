@AGENTS.md

# Ma Progression CP — État du projet

## Infos critiques
- **GitHub** : `christopheMia/ma-progression-cp` (PAS christophe-mialon — mauvais username)
- **Vercel** : https://ma-progression-cp.vercel.app (team: christophemias-projects)
- **Supabase** : projet `odwgkakeepcqbgpsfugl` (odwgkakeepcqbgpsfugl.supabase.co)
- **Edge Function** : `create-user` déployée et active (crée users sans confirmation email)

## Problème en cours
- La page d'inscription affiche TOUJOURS du texte blanc sur fond blanc
- Cause : la version déployée sur Vercel est encore l'ancienne (commit `dbf34cd`)
- Les 3 commits de fix ont été poussés via API GitHub mais le build Vercel échoue

## Commits récents poussés (via API GitHub, pas git push)
1. `10d4e8f` — fix: connexion page - restore missing closing JSX tags + text-gray-900
2. inscription/page.tsx — fix: Edge Function sans confirmation email + text-gray-900  
3. middleware.ts — fix: middleware auth — CE COMMIT EST EN ERREUR sur Vercel

## Cause racine des builds Vercel qui échouent
Le fichier `src/app/(auth)/connexion/page.tsx` était TRONQUÉ dans le repo git
(les 4 dernières lignes `</p>`, `</form>`, `)`, `}` manquaient → JSX invalide)
Ce bug a été introduit lors d'un Edit qui a remplacé le bas du fichier par une ligne vide.

## Fix appliqué
- `connexion/page.tsx` : reécrit complet avec `text-gray-900` sur les inputs
- `inscription/page.tsx` : utilise Edge Function `create-user` + `text-gray-900`
- `middleware.ts` : protection des routes avec @supabase/ssr

## Architecture auth
- Connexion : `supabase.auth.signInWithPassword()` directement
- Inscription : appel Edge Function `POST /functions/v1/create-user` avec anon key JWT
  → La Edge Function utilise `SUPABASE_SERVICE_ROLE_KEY` + `email_confirm: true`
- Middleware : createServerClient avec cookies, redirige / → /connexion si non connecté

## Variables d'environnement Vercel (déjà configurées)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## État actuel (session 2026-06-13)
- Build Vercel OK : commit `ebe5256` "fix: remove middleware to unblock build" — READY 29s
- Texte visible sur les pages connexion/inscription ✅
- Edge Function `create-user` v2 déployée avec CORS sur toutes les réponses ✅
- Compte Cécile créé : `azylis69@hotmail.fr` (mot de passe réinitialisé via SQL)
- middleware.ts supprimé du repo pour débloquer le build (à remettre plus tard)

## Manuels disponibles (session 2026-06-13)
8 manuels dans `src/data/manuels/` :
- Lecture Piano (Retz 2025)
- Calimots (Retz 2025) — nouveau
- Taoki et compagnie (Hachette 2025) — nouveau
- Timini (Nathan 2025) — nouveau
- 1.2.3 Lune! (Bordas 2024) — nouveau
- À moi de lire! (Magnard 2024) — nouveau
- Ribambelle (Hatier)
- Au CP avec Méli (Lelivrescolaire)

⚠️ Les progressions des nouveaux manuels sont approximatives (basées sur guides publics en ligne). À vérifier avec les vrais manuels.

## Corrections UI (session 2026-06-13)
- Texte noir forcé (text-gray-900 bg-white) sur tous les inputs/selects
- Bouton ← Étape précédente dans le wizard de configuration
- Indicateur ✓ Sauvegardé dans CahierJournalEditor et StudentTracking
- Commit poussé : 7dd4a5e (UI) + nouveau commit manuels

## À faire prochaine session
1. **Page "Mot de passe oublié"** — supabase.auth.resetPasswordForEmail() + page /reset-password
2. **Vérifier progressions manuels** — corriger les graphèmes semaine par semaine avec les vrais guides
3. **Tester le planning** — vérifier que Cécile voit son tableau de bord après connexion
4. Supprimer le fichier `push-fix.bat` du dossier projet (inutile)
