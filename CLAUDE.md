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

## État actuel (session 2026-06-13)
- Build Vercel : dernier commit poussé = `7dd4a5e` (corrections UI)
- Texte visible sur toutes les pages ✅
- Edge Function `create-user` v2 active ✅
- Compte Cécile : `azylis69@hotmail.fr` ✅
- middleware.ts supprimé (conflictait avec proxy.ts — Next.js 16 utilise proxy.ts)

## Token GitHub
- Le token PAT est dans l'URL remote git
- Il expire ou est révoqué si exposé dans un log/chat
- **Procédure renouvellement** : github.com → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (scope: repo)
- Puis : `git remote set-url origin https://christopheMia:TOKEN@github.com/christopheMia/ma-progression-cp.git`

## Manuels disponibles — 8 manuels dans `src/data/manuels/`
| Manuel | Éditeur | Progression |
|--------|---------|-------------|
| Lecture Piano | Retz (2025) | ✅ vérifiée |
| Calimots | Retz (2025) | ⚠️ approximative |
| Taoki et compagnie | Hachette (2025) | ⚠️ approximative |
| Timini | Nathan (2025) | ⚠️ approximative |
| 1.2.3 Lune! | Bordas (2024) | ⚠️ approximative |
| À moi de lire! | Magnard (2024) | ⚠️ approximative |
| Ribambelle | Hatier | ⚠️ approximative |
| Au CP avec Méli | Lelivrescolaire | ✅ vérifiée |

## Corrections UI appliquées
- Texte noir (text-gray-900 bg-white) sur tous les inputs/selects
- Bouton ← Étape précédente dans le wizard de configuration
- Indicateur ✓ Sauvegardé dans CahierJournalEditor et StudentTracking

## À faire prochaine session
1. **Pousser le commit manuels** — `e41dbb5` en attente (besoin nouveau token GitHub)
2. **Page "Mot de passe oublié"** — supabase.auth.resetPasswordForEmail() + page /reset-password
3. **Vérifier progressions manuels** — corriger graphèmes semaine/semaine avec vrais manuels
4. **Tester le planning** — vérifier que Cécile voit son tableau de bord après connexion
5. Supprimer `push-fix.bat` et `DEPLOY.md` (inutiles)
