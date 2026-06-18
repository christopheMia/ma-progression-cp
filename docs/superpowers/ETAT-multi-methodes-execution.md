# État d'exécution — Multi-méthodes (reprise)

> Branche `feat/multi-methodes`. Exécution subagent-driven du plan `docs/superpowers/plans/2026-06-16-multi-methodes.md` (14 tâches). Démarré session 2026-06-18.

## Avancement

- ✅ **Task 1** — `src/lib/matieres.ts` (MATIERES_METHODE, LABELS_MATIERE, isMatiereMethode) + test. Commit `9410dfb`.
- ✅ **Task 2** — `supabase/migrations/003_multi_methodes.sql` (table `progression` + colonne `matiere` sur acquisitions/appreciations + recopie francais). Noms de contraintes **vérifiés en prod** (`acquisitions_semaine_id_eleve_id_grapheme_key`, `appreciations_semaine_id_eleve_id_key`). Commit `cac1501`.
- ✅ **Task 3** — types `Progression` + `matiere` sur Acquisition/Appreciation (`src/types/index.ts`). Commit `f0818e7`.
- ✅ **Task 4** — schéma IA générique `graphemes`→`items`. **PÉRIMÈTRE ÉLARGI** : rename propagé à TOUS les consommateurs de `ProgressionSemaine` (lecture-piano, ManualSelector, parse-manuel-pdf, IaImport, ProgressionCorrector, progression-ia, progression, accueil/planning mappings). `Semaine.graphemes` (colonne DB) **gardée intacte**. Fix bonus : `ia-chat/route.ts` CHAT_SCHEMA→items (régression du rename). `docsmethodes/` ajouté au `.gitignore`. Commits `12bafc3`, `09914db`, `248aa78`, `5263e0f`.
- ✅ **Task 5** — `systemImport(matiere)` (francais/maths) + exhaustivité, remplace SYSTEM_IMPORT. Commit `9e05545`.
- ✅ **Task 6** — `src/lib/ia/couverture.ts` (`notionsManquantes`) + test. Commit `b75c6f7`.
- ✅ **Task 7** — route `ia-manuel` lit `matiere` (multipart + JSON) → `systemImport(matiere)`. Commit `9118905`.
- ✅ **Task 8** — action `enregistrerProgressionMatiere` (delete+insert filtré par matière, non destructif). Commit `b497106`.
- ✅ **Task 9** — **PÉRIMÈTRE RÉDUIT (décision sécurité)**. Voir ci-dessous. Commit `c829489`.

État build/tests à la fin de Task 9 : `npx jest` = **38/38 verts**, `npx next build` = Compiled successfully, `npx tsc --noEmit` propre.

## ⚠️ Déviations par rapport au plan (assumées)

### Task 9 réduite — colonnes `semaines` NON supprimées
Le plan voulait renommer `genererProgression`→`genererSemaines`, arrêter d'écrire les colonnes méthode dans `semaines`, **supprimer** ces colonnes (migration `004`) et éditer le type `Semaine`. **NON FAIT** car `semaines.graphemes` est `NOT NULL` et encore lu par accueil/planning/WeekCard/cahier-journal/export-word (non migrés). Supprimer maintenant casserait le build au milieu et planterait la prod entre déploiement et migration 004.

**À la place** : `genererProgression` + insert `semaines` gardés tels quels ; **ajout** de `genererProgressionFrancais` + insert `progression(matiere='francais')` à la création de classe. La table `progression` est donc peuplée (ce dont Tasks 11-13 ont besoin). La règle « sans écrasement » est garantie par la table séparée + l'action par matière (Task 8), PAS par la suppression des colonnes.

**Reporté à un nettoyage final** (hors plan listé, à faire seulement quand TOUS les lecteurs de `Semaine.graphemes` seront migrés vers `progression`) : migration `004_semaines_cleanup.sql` + retrait des champs `graphemes`/`manuel_pages`/`mots_exemple` du type `Semaine`.

- ✅ **Task 10** — `IaImport` : sélecteur matière (gated `matiereFixe`) + multi-fichiers + compteur de couverture (MVP) + double chemin `onSelect`/`onSave`. Commit `c85bfa5`.
- ✅ **Task 11** — affichage par matière : `MatiereBlock` générique remplace `LectureBlock`, fiche semaine lit la table `progression` (repli `semaine.graphemes` pour le français). Commit `fdc1060`.
- ✅ **Tasks 12+13 (fusionnées)** — suivi + bilan par matière : `toggleAcquisition`/`upsertAppreciation` reçoivent `matiere`, StudentTracking en sections par matière (état clé `${eleveId}|${matiere}`), Bilan IA par matière (RGPD `[ELEVE]` préservé), `ia-bilan`/`userBilan` neutralisés (`itemsAcquis`/`itemsNonAcquis`). Commit `36e3030`.
- ✅ **Task 14** — Paramètres : section « 📚 Mes méthodes » (`MethodesEditor` → `IaImport` `matiereFixe` + `onSave`=`enregistrerProgressionMatiere`) ; section manuel renommée « ♻️ Tout régénérer ». Commit `3585b91`.

## ✅ TOUTES LES 14 TÂCHES TERMINÉES

Vérification finale : `npx jest` = **38/38**, `npx tsc --noEmit` propre, `npx next build` = Compiled successfully.

### Revue finale — 2 bugs d'intégration corrigés (commit `0d9114d`)
La fiche semaine lit le français depuis la table `progression`, mais deux écrivains du français écrivaient encore SEULEMENT dans `semaines.graphemes` (deux sources de vérité, conséquence de la Task 9 réduite) :
- **`corrigerProgression`** (« Corriger la progression » Planning/Accueil) → corrige maintenant AUSSI `progression(francais)`.
- **`updateManuel`** (« Changer de manuel ») → régénère AUSSI `progression(francais)` (le maths importé est préservé).
- Bonus : `chargerClasseDemo` peuple `progression(francais)` + `matiere` explicite sur les acquisitions.
Mineurs restants (non bloquants) : `couverture.ts`/`notionsManquantes` non câblé (MVP compteur retenu) — gardé comme utilitaire futur.

## Déploiement (rappel)
- Appliquer `003_multi_methodes.sql` en prod **AVANT** de déployer le code (sinon insert `progression` plante).
- Migration `004` : **NE PAS appliquer** (non écrite ; nettoyage différé, voir déviation).
- Tester : import Français + import Maths, suivi + bilan par matière, aucun écrasement.

## Rappels techniques
- Modèle IA = `claude-sonnet-4-6` partout (jamais Opus : timeout Vercel).
- `ProgressionSemaine.items` (couche import) ≠ `Semaine.graphemes` (colonne DB). Ne pas confondre.
