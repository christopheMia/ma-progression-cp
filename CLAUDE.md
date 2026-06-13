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
- Build : propre ✅ (`npx next build` → Compiled successfully)
- Texte visible sur toutes les pages ✅
- Edge Function `create-user` v2 active ✅
- Compte Cécile : `azylis69@hotmail.fr` ✅
- middleware.ts supprimé (conflictait avec proxy.ts — Next.js 16 utilise proxy.ts)
- `@anthropic-ai/sdk` installé mais non utilisé (décision : pas d'API payante)

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
1. **Pousser le code** — les fichiers suivants n'ont pas encore été poussés sur GitHub :
   - `src/app/api/parse-manuel-pdf/route.ts` (nouvelle route)
   - `src/components/setup/ManualSelector.tsx` (import PDF + CSV)
   - `next.config.ts` (serverExternalPackages)
   - `package.json` + `package-lock.json` (pdf-parse, @anthropic-ai/sdk ajoutés)
   - `CLAUDE.md`, `AGENTS.md` (mis à jour)
   - Commande : `git add -A && git commit -m "feat: import PDF gratuit + suppression manuels approximatifs" && git push`

2. **Page "Mot de passe oublié"** — `supabase.auth.resetPasswordForEmail()` + page `/reset-password`

3. **Tester le planning** — vérifier que Cécile voit son tableau de bord après connexion

4. **Supprimer `push-fix.bat` et `DEPLOY.md`** — fichiers inutiles à la racine

5. **Tester l'import PDF** — essayer avec un vrai manuel numérique CP pour vérifier la détection des semaines
