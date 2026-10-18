# Avancement : une séance du document, un créneau du cahier journal

## POINT DE REPRISE DU 18/10, soir : CARNET DE RANGEMENT, ÉTAPE 1 CODÉE (LIRE EN PREMIER)

Branche `seances-taches-5-12`, **pas fusionnée, pas en ligne**. **Migration 031 APPLIQUÉE en base le 18/10 au soir** avec l'accord de Christophe, après la sauvegarde `backup-2026-10-18.json` (24 tables, 3 empreintes md5 vérifiées, lignes recomptées en base, dossier `Desktop/claude/_backups_ma-progression-cp`). Table `regles_rangement` vide, RLS active, une policy propriétaire, droits `authenticated` seulement ; le contrôle de sécurité Supabase ne signale rien sur elle. Sans effet pour Cécile tant que son carnet est vide ; le code en ligne ne lit pas encore cette table. Les 13 tâches du plan `docs/superpowers/plans/2026-10-18-carnet-de-rangement-etape-1.md` sont codées (une par sous-agent Sonnet), puis relues par Opus en deux temps (tâches 1 à 5, puis 6 à 12), chaque relecture vérifiée après ses correctifs.

| Fait | Preuve |
|---|---|
| Table `regles_rangement` (migration 031), écrite, NON appliquée | `8de0673` |
| Logique pure du carnet, notions, cahier journal qui applique le carnet en premier, lecture tolérante | `f90c56d`, `5afcbae`, `8f7ddfe`, `0d5ffa0` |
| « Mon rangement » : logique, actions serveur, appel Haiku 5.5 `ia-regle`, composant « avec mes mots », section dans Paramètres | `db5598c`, `a3d2a65`, `1080284`, `db37158`, `64d28c6`, `a89d73e`, `a8dabbd` |
| Correctifs de relecture : séance datée prioritaire, jour préféré absent ou plein = premier jour avec une case libre, ordre déterministe des règles, avertissement si lecture en échec, `tableAbsente` strict | `9b9cf02`, `fd9d6f5` |
| Correctifs de la relecture finale : `type` limité à 80 caractères (coût), « Je réexplique » deux fois = poser à la main, messages qui ne se contredisent plus, Annuler / Plus tard, accessibilité, « pas activé » seulement si la table manque, tests de propriété de la classe et des pannes IA | `0f399c3` |
| Tests | **1204 sur 1204**, `tsc` muet, aucun tiret long ajouté |
| Carnet vide = cahier journal identique | tests « carnet vide », vérifié par deux relectures Opus |

**Seul ancien test modifié** : `parametres/page.test.ts` (« un seul appel ») : seule exception, `regles_rangement` lu EN PARALLÈLE de `page_parametres` dans le même `Promise.all`, donc toujours un aller-retour. Décision de Claude, à valider par Christophe. Plus une ligne ajoutée au `test.each` de `anthropic.test.ts` (prévue par le plan).

**Laissé pour plus tard (relecture finale)** : prévenir quand une règle en remplace une autre du même type ; le message de refus de l'IA parle de « document » ; la route `ia-regle` enchaîne plusieurs lectures en base avant l'appel (vitesse) ; un domaine de séance « EMC/EVARS » n'est pas coupé en deux types comme pour les notions. Dernière relecture : la sortie « Je n'ai pas compris » s'affiche aussi après deux « Je réexplique » (formulation de la conception, un peu étrange quand l'IA avait compris mais s'était trompée) ; `supprimerRegle` ne vérifie pas que `id` est un texte (sans danger).

**Ce qui attend Christophe (rien fait sans son accord)** :
1. ~~Appliquer la migration 031~~ FAIT le 18/10 au soir (voir plus haut).
2. **PROCHAINE ACTION (arrêt du 18/10 au soir, Christophe passe sur l'extension VS Code)** : essai réel PAS ENCORE FAIT. L'appli tourne déjà en local sur http://localhost:3100 (serveur lancé depuis ce dossier, donc sur cette branche) ; Christophe se connecte lui-même au compte de test `christophe.mialon+test@gmail.com` (mot de passe dans son gestionnaire, Claude ne le tape jamais). Puis essai sur la classe « Bac a sable » (jamais celle de Cécile) : ajouter « le chant c'est en musique le jeudi », vérifier la règle, régénérer une semaine qui a du chant, relever le coût de l'appel dans la jauge IA.
3. Mise en ligne de la branche (avec le reste de `seances-taches-5-12`), puis régénérer avec Cécile ses semaines déjà ouvertes.

**Suite** : plan de l'étape 2 (« Toujours ? » + « Autrement » depuis le cahier journal). Restent aussi les tâches 10 à 12 du chantier séances (voir « État des tâches »).


## Point de reprise du 11/10/2026 : DÉPLOYÉ, et l'appli s'appelle ProfEnPoche

| Fait | La preuve |
|---|---|
| Le travail du 20/09 est en production | `npx vercel --prod` le 11/10 (CLI déjà connectée, compte christophemia), déploiement « Ready » |
| Textes renommés en ProfEnPoche (onglet, connexion, barre du haut, accueil, assistant IA) | commit `3c51980`, 892 tests verts, `tsc` muet ; `<title>ProfEnPoche</title>` lu sur la production |
| Nouvelle adresse | `profenpoche.vercel.app` ajoutée au projet ; l'ancienne `ma-progression-cp.vercel.app` marche toujours (raccourci de Cécile à changer plus tard) |

**CONSTAT DU 17/10, ~17 h 20 (connecteur Supabase enfin chargé, lecture seule)** : le remplissage 028 a DÉJÀ été passé, sur les DEUX classes (Cécile `58a4e1e4…` et bac à sable `f097baca…`), sans que personne l'ait consigné. Preuve : 154 lignes de `progression` sur 154 ont des `seances` dans chaque classe, 715 séances par classe, 422 avec un jour, et **aucune** avec un domaine renseigné : c'est la signature exacte de 028 (`'domaine', ''`), alors qu'un import réel calcule le domaine (`progression-seances.ts`). Qui l'a lancé et quand : inconnu (pas de colonne de date sur `progression`). Le point (2) ci-dessous est donc fait. Le connecteur était masqué par le plugin `supabase` de Claude Code : le désactiver dans `/plugins` (fiche mémoire `supabase-connecteur-cache-par-plugin`).

**À FAIRE, trouvé le 17/10 : l'appli n'a AUCUN « mot de passe oublié »** (ni `resetPasswordForEmail` ni page de nouveau mot de passe dans `src/`, connexion par `signInWithPassword` seul). Un mot de passe perdu = compte bloqué, Cécile comprise. Le compte de test se connecte avec `PROFENPOCHE_TEST_PASSWORD` de `.env.local` (celui du gestionnaire de Christophe était faux : 7 refus `invalid_credentials` le 17/10, rien à voir avec la règle des 8 caractères).

**PANNE TROUVÉE le 17/10 ~17 h 30 : l'import de documents est CASSÉ en production, pour tout le monde (Cécile comprise), depuis le déploiement du 11/10.** Journal Vercel, `POST /api/ia-manuel` à 15:30:32 UTC : `Streaming is required for operations that may take longer than 10 minutes`. Cause : `PLAFOND_SORTIE_PROGRESSION = 32000` (passé de 16000 le 21/08, commit `ced1158`, pour les séances) avec un `messages.create` sans streaming ; le SDK Anthropic refuse d'avance tout appel non streamé au-delà d'environ 21 000 jetons. Les tests simulent le client, ils ne pouvaient pas le voir. Deuxième risque : `maxDuration = 60` s, trop court pour une année entière en sortie. **CORRIGÉ ET MIS EN LIGNE le 17/10 vers 17 h 45** (commit `d586b89`, déploiement `dpl_3x8ivokZX5Upw19U6PCCzXayFofY` Ready, 894 tests verts ; essai réel sur Bac a sable encore à refaire). Correctif : `messages.stream(...).finalMessage()` + `maxDuration` relevé (300 s possible sur Hobby). En plus, dans `SourceImporter.tsx`, le bouton « Analyser le document » n'analyse que le texte collé (le fichier part tout seul au choix), et rechoisir le même fichier ne relance rien (la valeur du champ n'est jamais remise à zéro).

**ESSAI RÉEL DU 17/10 vers 17 h 55, classe Bac a sable (Cécile intacte : empreinte `b1a61caa…` inchangée)** : l'analyse marche (85 % de confiance). Le document arts a été classé **programmation** (il était **manuel** en juillet). Trois défauts nouveaux :
1. **Messages d'erreur masqués en production** : une `Error` levée dans l'action serveur `ajouterSourceProgression` arrive à l'écran en « An error occurred in the Server Components render… ». Le vrai message n'est que dans le journal Vercel. Vaut pour TOUS les refus de `src/lib/methode-sources.ts`.
2. **Refus trop strict sur le nom de méthode** (« Arts utilise déjà la méthode Arts plastiques, poésie et éducation musicale. Le document indique Arts (poésie, arts plastiques, éducation musicale) »). Contournement : retaper le nom existant à la vérification.
3. **GRAVE, perte de données à l'ajout d'une 2e source** : ajouter la programmation par-dessus le manuel a réécrit les 36 semaines d'arts de la classe de test. Exemples : semaine 1, « Poésie » et « Arts plastiques » disparus (il ne reste que l'écoute musicale et le chant) ; semaine 2, un item parasite « Poésie : S1 S2 S3 S4 : … » ; et les 80 séances d'arts tombées à **0** (`seances = []`). Sur la classe de Cécile, ce serait son année d'arts perdue. La classe de test n'est PAS remise en état (décision à prendre avec Christophe).

   **Enquête du 17/10 (lecture du code, rien modifié), deux causes distinctes :**
   - **Séances perdues = vrai défaut, une SIXIÈME porte que le plan n'avait pas vue.** Tout le chemin « sources » ignore les séances : `lireSemaine` et `copierSemaine` de `src/lib/progression-sources.ts` reconstruisent chaque semaine avec `numero/items/pages/mots_exemple` seulement, et `materialiserSources` passe ces lignes à `enregistrer_source_progression` puis `remplacer_progression`, qui écrit donc `seances = []`. Aucune mention de `seance` dans `progression-sources.ts`, `methode-sources.ts` (les deux), `repartition-periode.ts`. Ce chemin sert à **trois** endroits : Paramètres (ajouter et retirer un document), l'assistant flottant, et la création de classe (`setup-creation.ts`). Conséquences : un nouvel utilisateur n'obtient jamais de séances par import, et tout ajout ou retrait de document efface les séances de la matière, y compris celles remplies par 028. Les anciennes sources (juillet) n'ont pas de séances dans `contenu_structure` : le correctif doit les relire depuis les items (`seancesDepuisItems`, même règle que la route).
   - **Items remplacés = comportement voulu, mais dangereux.** `niveauPrecision` : periode 3 > programmation 2 > manuel 1. Une programmation l'emporte donc semaine par semaine sur un manuel, et la semaine entière est remplacée (pas fusionnée) par la répartition de `repartirProgrammation`. Le même PDF classé manuel en juillet et programmation le 17/10 s'est donc écrasé lui-même. Lié au retour de Cécile du 22/07 (choix du type trop difficile). **Décision de Christophe (17/10, option a)** : prévenir avant d'écraser. Avant l'ajout, l'écran dit combien de semaines déjà remplies le document va remplacer, avec le choix « Remplacer » ou « Garder l'existant ». Rien ne change sans que l'enseignante le voie, et elle n'est jamais bloquée. **CODÉ le 17/10 au soir, en local, PAS en ligne, relu par un sous-agent code-reviewer, ses 3 points graves corrigés** : `executerAjoutSourceProgression` compare l'après avec les lignes ACTUELLES de `progression` (nouvelle dépendance `lireProgression`), car `remplacer_progression` efface toute la matière, retouches à la main comprises ; il rend `a-confirmer` (semaines qui changent ou disparaissent, rien d'écrit) tant que `semainesConfirmees` ne correspond pas exactement à la liste recalculée ; l'avertissement de l'écran ne vaut que pour l'analyse et le décalage vus (une retouche l'annule), « Garder l'existant » est bloqué pendant un envoi ; panneau ambre dans `SourceImporter` (« Garder l'existant » = rien n'est ajouté, « Remplacer ces semaines » = rappel confirmé). Dans le même lot : les actions serveur rendent `{ statut: 'erreur', message }` au lieu de lever (messages lisibles en production), et un nom de méthode différent reprend le nom déjà enregistré au lieu de bloquer. 904 tests verts. Restes de la relecture, non traités : (4) un document MOINS précis que l'existant est enregistré mais ne change aucune semaine, et l'écran dit « Document ajouté » ; (7) le message de refus s'affiche deux fois, préfixé « Impossible de préparer la source » ; (9) `lierCreneaux` (`actions/methodes.ts`) lève encore ses erreurs (masquées en production). Limite connue : « Garder l'existant » n'ajoute rien du tout ; « ne compléter que les semaines vides » demanderait une migration (contrainte `methode_sources_document_coherent` qui lie la précision au type).
   - **Séances : CORRIGÉ le 17/10, en local, PAS mis en ligne.** `lireSemaine` garde les séances du document et les complète depuis les items (`completerSeances(lireSeances(...), items)`), la répartition d'une programmation reçoit `seancesDepuisItems`, `copierSemaine` les copie, une semaine qui ne porte que des séances est gardée. `toSeances` de `ia/schema.ts` est devenue `lireSeances` dans `progression-seances.ts` (une seule lecture). Aucune migration : `enregistrer_source_progression` et `retirer_source_progression` passent `p_lignes` telles quelles à `remplacer_progression`, qui lit `seances` depuis 029 (vérifié en base). 4 tests nouveaux, 898 tests verts, `tsc` muet.

**PREUVE EN PRODUCTION (17/10, ~18 h 35)** : déploiement `dpl_BzTgrFiaVP8sTaFj2dn48Vj75zs4` (commits bd264a0 + d0c99a1). Christophe a retiré dans Paramètres le document arts « programmation » de Bac a sable. Résultat en base : arts de la classe de test **identique à celle de Cécile**, 36 semaines, 0 item différent, **80 séances sur 80** (avant le correctif, un recalcul les mettait à 0). Les 5 matières concordent, 1 document chacune. Classe de Cécile intacte (empreinte `b1a61caa…` inchangée). Classe de test remise en état.

**17/10 ~18 h 46, EN LIGNE** : page Paramètres (sommaire + sections réductibles, validée par Christophe) et bouton de l'assistant placé par défaut dans l'en-tête à droite du logo (`positionPresDuLogo`, attribut `data-logo-entete` dans `(app)/layout.tsx`), bulle d'accueil sous le bouton et toujours dans l'écran (`placerBulle`). Commits 37de25b et 2019ab4.

**DEMANDE DE CHRISTOPHE (17/10, ~18 h 25), CODÉE le soir même, PAS en ligne** (`SectionRepliable` et `SommaireParametres` dans `src/components/parametres/`, boutons Réduire/Ouvrir, Tout réduire/Tout ouvrir, état mémorisé dans le navigateur, contenu gardé monté ; 909 tests verts) : dans Paramètres, pouvoir **réduire chaque section avec un bouton** (précisé : un vrai bouton visible, pas seulement un clic sur le titre), et un **sommaire cliquable** en haut pour aller directement à la bonne section (« il faut scroller pour arriver au bon endroit, c'est long »). La page (`src/app/(app)/parametres/page.tsx`) a déjà un `id` et `scroll-mt-24` sur chaque section. Piège connu : une ancre `#section` se perd sur une page qui a un `loading.tsx` (fiche mémoire `cp-ancres-loading-tsx`), et cette page en a un.

## POINT DE REPRISE DU 18/10, après-midi : LIRE EN PREMIER

Branche `seances-taches-5-12`, toujours **PAS fusionnée, PAS en ligne**. Christophe a dit « oui, on corrige la branche avec les réponses de Cécile et l'option B ». Fait, relu par Opus (aucune régression sur les vraies données de Cécile), ses remarques corrigées :

| Fait | Preuve |
|---|---|
| Simulation sur les VRAIES cases et notions de Cécile (lues en base, lecture seule ; ses cases ne sont reliées à AUCUNE méthode) | semaines 1, 2, 12, 21 : avant correctif, « Calcul : additions » allait dans Calcul mental, et « EMC / Poésie » montrait poésie ET EMC chaque lundi |
| Noms des cases : correspondance EXACTE (« Calcul mental » n'est plus « Calcul », « Flash maths » n'est plus « Maths », « Lecture-écriture » n'est plus « Écriture ») | `creneauNommePour` de `src/lib/notions-creneaux.ts` ; simulation : addition dans Mathématiques |
| « EMC / Poésie » : la poésie seule la semaine d'un NOUVEAU poème, l'EMC les autres lundis ; le poème qui continue ne part pas à placer | `placerNotionsDuJour` (créneau partagé = nom avec « / »), `genererCahierJournal(edt, progression, precedente)` ; `actions/journal.ts` charge la semaine d'avant |
| Option B : le français qui ne date rien garde l'ancien remplissage | `estFrancaisSansJours` dans `cahier-journal.ts` ; les 2 tests du repli rendus à leur intention |
| Export Word : une ligne par notion | `paragraphesDe` dans `export-word.ts` |
| Relecture Opus traitée | GRAVE : une EMC qui continue disparaissait sans être signalée chez une enseignante sans case « EMC » à part, maintenant à placer. Aussi : case partagée sans ligne d'EMC, semaine d'avant facultative (n'empêche plus le cahier), apostrophes typographiques, pages perdues, option B limitée au vrai « francais », case « Histoire, géographie » de la trame par défaut (avant sans virgule, elle ne recevait plus ses notions ; seules les nouvelles classes sont concernées) |
| Tests | **1071 sur 1071**, `tsc` muet ; tâche 7 (lundi réel) revue avec les réponses de Cécile, plus aucun échec voulu ; un test sur son vrai emploi du temps sans méthode, deux semaines |

**Non traité, à savoir** : « Chant » et « Écoute musicale » (5 semaines sur 36) partent à placer, la case « Musique » du jeudi ne porte pas leur nom. Arts : aucune notion « découverte d'une œuvre » dans les données de Cécile (sa case « je découvre une œuvre » est un rituel caché), rien à faire.

**Attention mise en ligne** : les cahiers journaux DÉJÀ générés sont figés en base (`cahier_journal`). Il faudra régénérer ceux de Cécile (bouton Régénérer) pour qu'elle voie les nouvelles règles, avec son accord, car régénérer écrase ses retouches.

**Reste** (mis à jour le 18/10 en fin d'après-midi) : relecture traitée et commitée (`378ea1c`). Écran d'accompagnement IA CADRÉ et VALIDÉ (« carnet de rangement », section CADRAGE en fin de fichier, conception `6007dd9`). Plan de l'étape 1 en cours d'écriture dans une session à part (« plan-carnet-etape1 »). Toujours à faire : tâches 10 et 11, relecture finale de la branche, mise en ligne avec l'accord de Christophe, puis régénérer avec Cécile ses semaines déjà ouvertes.

## POINT DE REPRISE DU 17/10, ~22 h (pause demandée par Christophe, fatigué)

Tout est sur la branche `seances-taches-5-12`, poussée sur GitHub, **PAS fusionnée, PAS en ligne**. Cécile n'a rien de nouveau. En ligne : seulement ce qui l'était à 18 h 46 (fiche de semaine lisible `7b78dfd` est sur `main`, poussée, PAS déployée).

| Fait ce soir | Preuve |
|---|---|
| Séances de français placées par le sens (tâche 5 refaite) | `3c00856`, `36480de`, relu 2 fois par Opus, approuvé ; vu en vrai sur la classe de test |
| « À placer » gardé à l'enregistrement (6), affiché (9), posé d'un menu (12) | `e31f1da`, `8f339f6`, `18605f9`, `4c3e0f8` ; posé « Langage oral » dans Ateliers de français lundi S3 classe de test, vérifié EN BASE après rechargement |
| Planning des Petites Poules figé (8) | `edd64d6` |
| Notions (maths, histoire-géo, arts) placées par le sens, une par ligne | `822393b`, relu par Opus : **changements demandés**, voir ci-dessous |

**État des tests sur la branche : 1050 sur 1052.** Les 2 échecs sont VOULUS, dans `cahier-journal-lundi-reel.test.ts` (tâche 7) : ils attendent l'ancien affichage des maths et d'« EMC / Poésie ». Ne pas les « réparer » sans l'accord de Christophe.

**Relecture Opus de `822393b`, à traiter AVANT toute fusion :**
1. RÉGRESSION pour une NOUVELLE enseignante (trame par défaut + manuel sans « Domaine : ») : son premier cahier journal n'affiche presque que des noms de cases, et tout son français part « à placer » le lundi. Cause : la règle des notions s'applique aussi au français sans jours, ce que personne n'a décidé.
2. Le test `cahier-journal.test.ts` (« repli : créneau français non relié ») a été modifié pour rester vert : il cachait cette régression. Lui rendre son intention.
3. Export Word : les notions sur plusieurs lignes s'y collent sur une seule (retours à la ligne non gérés dans `src/lib/export-word.ts`). À corriger.
4. Petits effets de bord des noms : « Calcul : ... » va dans « Calcul mental », « Maths : ... » dans le rituel « flash maths », « Écriture : ... » dans « Lecture-écriture ».

**Questions pour Christophe (en mots simples, une par ligne) :**
1. Le français sans jours (sommaire d'un manuel) doit-il suivre la même règle, ou garder l'ancien remplissage tant qu'il n'a pas de jours ?
   - **Idée de Christophe (18/10, matin), pas encore tranchée** : demander à l'enseignante dans quelle catégorie ranger ses séances, puis les placer correctement. Proposition de Claude : à l'import, l'IA propose une catégorie par ligne, l'enseignante valide ou corrige sur un seul écran groupé, avec « Plus tard » pour passer (jamais bloquée) ; en attendant, l'ancien remplissage (option B) s'applique. Rien n'est fait en silence, donc compatible avec la règle « pas de placement par devinette ». **Validé sur le principe par Christophe le 18/10 : « l'IA doit servir à ça pour accompagner l'utilisateur ».** Ordre proposé (à confirmer) : B pour la mise en ligne de la branche, puis l'écran d'accompagnement. Précisé ensuite : l'IA demande comment s'adapter au style de documents de chaque enseignante puis construit en conséquence, rien de figé ; coût en IA accepté. À prévoir : retenir les réponses (par classe ou par méthode) pour ne pas redemander à chaque import, et vérifier l'effet sur la jauge IA. Modèle (demande de Christophe : adapté sans être trop cher) : piste Haiku, un seul appel groupé par document (jamais un par ligne), à départager contre Sonnet sur un essai réel en classe de test ; vérifier les prix et les versions récentes (Haiku 5.5, Sonnet 5.5) au moment de coder, l'appli utilise aujourd'hui Sonnet 5 et Haiku 4.5 (`src/lib/ia/anthropic.ts`). **Précision de Christophe ensuite** : il faut de la réflexion pour aider à construire le bon tableau selon les informations de l'enseignante. Proposition de Claude, en deux temps : (1) construire le tableau avec elle, une fois (à la création de classe ou au premier import d'un manuel), modèle qui réfléchit (Sonnet) ; (2) le rangement répétitif ensuite, sur ce tableau déjà construit, modèle léger (Haiku). Piège connu : la réflexion de Sonnet 5 est activée par défaut, la régler volontairement (fiche mémoire `cp-chantier-modeles-31juillet`). Chantier à cadrer (skill brainstorming) avant d'écrire du code.
*(18/10 : questions 2 à 5 envoyées à Cécile par mail le 18/10 à 9 h 28.)*
**RÉPONSES DE CÉCILE (mail du 18/10, 11 h 35), font foi :**
- Q2, Arts visuels : la case ne reçoit PAS tout. Seule la **production** va dans la case Arts visuels ; la **découverte d'une œuvre** va dans la case « Découvrir une œuvre » (le mardi). Donc une règle par le nom, pas « tout dans la seule case ».
- Q3 : « Calcul : poser une addition » va dans **Mathématiques**, pas dans Calcul mental. Corriger l'effet de bord n° 4 de la relecture (« Calcul : » ne doit pas viser « Calcul mental »).
- Q4 : les rituels (flash maths, Chaque jour compte) **gardent seulement leur nom**. Confirme le comportement actuel.
- Q5 : la case du lundi « EMC / Poésie » montre la **poésie les semaines où on la découvre**, l'**EMC les autres lundis**. Ni « les deux », ni « seulement l'EMC » : dépend de la semaine. Les 2 tests voulus en échec de `cahier-journal-lundi-reel.test.ts` sont à revoir avec cette règle.
2. Quand une matière n'a qu'une seule case dans la journée (« Arts visuels »), cette case reçoit-elle toutes ses notions ? (avis du relecteur : oui, c'est la correction la plus simple pour une nouvelle enseignante)
3. « Calcul : poser une addition » : dans « Calcul mental » ou dans « Mathématiques » ?
4. Les rituels (« flash maths », « Chaque jour compte ») ne reçoivent-ils jamais rien ?
5. Tâche 7, lundi réel : « Chaque jour compte » et « flash maths » montrent leur nom, « calcul mental » seulement le calcul mental, « EMC / Poésie » seulement l'EMC. On valide ?

**Reste ensuite** : tâches 10 et 11 (vérifier l'import jour par jour, déplacer une séance), relecture finale de toute la branche, puis mise en ligne avec l'accord de Christophe. Puis le chantier assistant (il doit pouvoir faire les corrections, exigence du 17/10).

## Avancement du 17/10 au soir, branche `seances-taches-5-12` (NON fusionnée, NON en ligne)

| Tâche | État | Preuve |
|---|---|---|
| 5. Une séance par créneau | faite, puis REMPLACÉE par le placement par le sens | `d61b1ad`, puis `3c00856` + `36480de` (nouveau `src/lib/familles-seances.ts`), relu par Opus deux fois, approuvé |
| 6. La sauvegarde garde « à placer » | faite | `e31f1da` + `8f339f6` (limites de taille comme `validerSeance`), relue |
| 8. Planning réel des Petites Poules figé | fait | `edd64d6` (test seul, LC partout vérifié) |
| 9. Afficher « à placer » | faite | `18605f9`, vu en vrai sur localhost, classe de test, semaine 3 : lundi Graphèmes en Phonologie, Vocabulaire en Étude de la langue, Geste d'écriture en Écriture, « Langage oral » à placer ; vendredi LC en Compréhension |
| 7, 10, 11, 12 | à faire | 7 demande à Christophe de valider les valeurs sur le vrai emploi du temps |

1021 tests verts, `tsc` muet. Le cahier journal de la semaine 3 de la classe de test a été généré le 17/10 (essai).

**Limites connues du placement, hors des données de Cécile (relecture Opus, non corrigées)** : une case « Compréhension de l'oral » accepte encore LC ; une case « Lecture et écriture » est lue comme Écriture ; quand la case la plus précise est prise, la séance suivante de la même famille peut tomber dans une case générique « Français » ; « Écriture : les boucles » part en « à placer » ; « copie » compte comme Écriture.

**DÉCISION DE CHRISTOPHE (17/10, « il faut écrire des choses lisibles et structurer », puis « oui »)** : même logique pour les progressions de NOTIONS (maths, histoire, EMC...). Chaque notion va dans la case qui porte son nom (« Problèmes : ... » dans « Problème », « Calcul mental : ... » dans « Calcul mental ») ; ce qui n'a pas de case précise va dans la case générale de la matière (« Mathématiques ») ; les rituels (Chaque jour compte, Flash maths) affichent leur nom ; une case qui reçoit plusieurs notions les met une par ligne, jamais collées par des virgules. Le constat ci-dessous est donc le chantier suivant.

**Constat à traiter plus tard** : dans le cahier journal, les créneaux de maths d'un même jour (Chaque jour compte, flash maths, maths, calcul mental) affichent tous le même texte complet des notions de la semaine. Ce n'est pas ce chantier (progressions de notions, comportement d'avant), mais c'est le même défaut « brouillon » que Christophe a signalé.

## DÉCISION DE CHRISTOPHE (17/10, soir) : placer les séances PAR LE SENS, pas dans l'ordre

Constat de la relecture Opus de la tâche 5 (branche `seances-taches-5-12`, commit `d61b1ad`) : remplir les créneaux de français « dans l'ordre » (règle D.4 du plan d'août) met 5 séances sur 12 au mauvais endroit sur le vrai emploi du temps de Cécile (5 à 6 créneaux de français par jour pour 2 à 4 séances : Vocabulaire dans « Ateliers de français », Geste d'écriture dans « Étude de la langue »). Faux qui a l'air juste.

Réponse de Christophe : « oui » à la règle suivante. Une séance va dans le créneau dont le NOM lui correspond sans hésitation (Vocabulaire ou Grammaire vers « Étude de la langue », Geste d'écriture vers « Écriture », Graphème vers « Phonologie », LC vers « Compréhension », PDE vers « Production d'écrits »). Aucun créneau ou plusieurs possibles : la séance va dans « à placer », Cécile la pose d'un clic. Jamais de devinette (règle du 31/07).

Précision de Christophe (17/10) : Fluence, Lettres muettes, Les prénoms de la classe et Langage oral n'ont PAS de case attitrée (« c'est des choses ponctuelles qui reviennent régulièrement ») : elles restent dans « à placer », ne pas leur ajouter de famille.

## Point de reprise du 17/10/2026, 19 h : PROCHAINE SESSION = rendre l'assistant vraiment utile

**Décision de Christophe (17/10)** : « si il sert à rien c'est pas la peine de le mettre, il faut un vrai intérêt ». Session neuve dédiée.

**Ce que fait l'assistant aujourd'hui (lu dans le code le 17/10)** : `src/components/assistant/ChatAssistant.tsx` (3 amorces seulement, toutes sur le démarrage) appelle `src/app/api/assistant/route.ts` (modèle `MODELE_COURT` = Haiku, 2 000 tokens, texte seul). Son prompt `systemAssistant` (`src/lib/ia/prompts.ts`) ne connaît que le prénom, la date de rentrée et la liste des matières : il ne voit NI le contenu des semaines, NI les élèves, NI le cahier journal, et n'agit sur rien. Il connaît mal Livret, emploi du temps, cahier journal (risque de réponses inventées). Onglet « Document » = import (marche, corrigé le 17/10).

**EXIGENCE DE CHRISTOPHE (17/10 au soir)** : « si il y a des corrections à faire il faut que ce soit possible manuellement et aussi que l'assistant puisse le faire ». À la main : déjà possible dans le cahier journal (bouton Modifier sur chaque case, menu pour poser une séance « à placer »). Par l'assistant : PAS encore, il ne voit ni n'agit sur rien. À inclure dans le chantier assistant comme premier usage concret (« mets le vocabulaire de lundi dans Étude de la langue », « déplace la poésie à jeudi »), avec confirmation avant d'écrire.

**Pistes proposées à Christophe, non tranchées** : (1) rapide : encadré « Ce que je sais faire », une dizaine d'amorces en 3 groupes (L'appli / Ma classe / Pédagogie), et lui donner le guide de l'appli depuis la MÊME source que la page Aide (`src/app/(app)/aide/page.tsx`), sans copie qui diverge ; (2) le vrai intérêt : lui faire VOIR la classe (contenu de la semaine, élèves, acquis) pour « qu'est-ce que je fais cette semaine », « prépare ma journée de lundi », etc. Coût : plus de crédit IA par question, à arbitrer. Commencer la session par le skill `brainstorming` (qu'est-ce qui serait vraiment utile à Cécile ?).

**En attente de mise en ligne** : commit `5be1b34`, la bulle d'accueil dit « Tu peux me déplacer et me mettre où tu veux ! » (testé, poussé, pas déployé). Le regrouper avec le chantier assistant.

**Restes ouverts du 17/10** : pas de « mot de passe oublié » ; restes 4, 7, 9 de la relecture (voir plus bas) ; tâches 5 à 12 du chantier séances ; empreinte des sources (avis : ne rien changer).

**COMMENT REPRENDRE (17/10 soir)** : session neuve (le connecteur claude.ai Supabase n'était pas chargé dans la session du 17/10 alors qu'il est connecté sur claude.ai). Vérifier d'abord que les outils `mcp__claude_ai_Supabase__*` sont là. Puis : (1) Christophe importe un PDF de Cécile dans la classe de test, Claude vérifie en base les `seances` ; (2) sauvegarde de la base puis remplissage 028 classe de test, puis classe de Cécile ; (3) tâches 5 à 12. Deux décisions proposées à Christophe, réponse attendue : empreinte des sources = ne rien changer (avis de Claude) ; domaine en double = DÉJÀ TRANCHÉ par Cécile le 09/09 (« tu peux laisser LC tout le temps ») et codé le 06/09 (`12aa015`, table `ABREVIATIONS` de `progression-seances.ts`) ; l'avis du 17/10 qui proposait « Lecture compréhension » était faux, corrigé le 17/10 au soir.

**17/10 : réglages Supabase faits par Christophe** (accès retrouvé par le compte GitHub de youckyboy@gmail.com) : Site URL passée de `http://localhost:3000` à `https://profenpoche.vercel.app`, Redirect URLs `https://profenpoche.vercel.app/**` et `https://ma-progression-cp.vercel.app/**`, mots de passe 8 caractères minimum.

Reste : Vercel toujours pas relié à GitHub (un push ne déploie pas, passer par la CLI) ; logo plus tard ; puis les points 1 à 4 ci-dessous (essai d'import sur la classe de test, remplissage 028, empreinte des sources, prévenir Cécile).

## Point de reprise du 20/09/2026, après-midi : tout est fusionné et poussé, reste le déploiement

| Fait | La preuve |
|---|---|
| Sauvegarde de la base AVANT les migrations | `backup-2026-09-20.json`, 24 tables, 658 Ko, les 3 empreintes md5 recalculées localement correspondent. Prise à 11h35, donc après le travail de Cécile du jour (181 observations, contre 113 le 09/09) |
| Migration **029** appliquée en production | `pg_get_functiondef(remplacer_progression)` contient `seances jsonb` |
| Migration **030** appliquée en production | `pg_get_functiondef(page_semaine)` contient `date_debut` |
| Aucune donnée touchée | 308 lignes de progression, 181 observations, 48 élèves avant ET après |
| Comportement date/semaine repris selon le choix de Cécile | 3 tests réécrits, 29 verts sur le fichier |
| Fusion dans `main` et push | `92723e3`, poussé (`0d7f071..92723e3`) |
| Le piège du 09/09 revérifié | `vercel.json` et `src/app/api/veille/route.ts` présents sur les deux branches AVANT fusion, et toujours là après |
| L'ensemble | **892 tests sur 76 suites**, `tsc --noEmit` muet, sur `main` après fusion |

### Ce qui bloque le déploiement, et ce n'est pas le quota

Le forfait Vercel n'est **pas** saturé : compte Hobby, 20 builds sur 30 jours,
aucune erreur, temps de build classé « Included », zéro minute facturable.
L'information « saturé jusqu'en octobre » est périmée.

Le vrai blocage : **le projet Vercel n'est plus relié à GitHub.** La page du
projet propose « Connect Git Repository ». Un push sur `main` ne déclenche donc
plus aucun déploiement. La CLI Vercel fonctionne (59.23.2, projet lié dans
`.vercel/project.json`) mais **n'est pas authentifiée** : `vercel whoami` répond
`login_required`, et `vercel login` est interactif.

**Donc la production est toujours celle du 9 septembre.** Deux chemins, au choix
de Christophe : rebrancher le dépôt dans l'interface Vercel, ou lancer
`npx vercel login` puis `npx vercel --prod` depuis le dossier du projet.

### Ce qui reste après le déploiement

1. Essai réel sur la **classe de test** : importer un document et vérifier en
   base qu'une ligne de `progression` porte enfin ses séances.
2. Lancer le remplissage de l'existant, `supabase/remplissage/028_remplir_seances.sql`,
   classe de test d'abord. **Toujours pas lancé.**
3. Trancher la question de l'empreinte des sources (voir plus bas).
4. Prévenir Cécile que son signalement est corrigé.

---

## Point de reprise du 20/09/2026 : le correctif date/semaine est terminé et poussé

Le bug signalé par Cécile est corrigé. Quand une observation est créée depuis
une semaine mais que sa date appartient à une autre semaine scolaire,
l'interface ne la range plus silencieusement au mauvais endroit. Elle affiche
un choix clair : la ranger dans la semaine de la date, ou la conserver
volontairement dans la semaine ouverte.

Ce qui est terminé :

| Fait | Preuve |
|---|---|
| Migration `030_page_semaine_date_debut.sql` écrite | Elle recrée `page_semaine` avec la même signature et ajoute seulement `date_debut` dans `semaines_classe` |
| Régression SQL verrouillée | Le test compare la fonction 030 à la fonction 025 et n'accepte que cet ajout |
| Cas de Cécile verrouillé | Deux tests couvrent le choix S3 et le maintien volontaire en S4 |
| Suite complète | `npm test -- --runInBand` : **891 tests, 76 suites, tout vert** |
| Contrôles de production | `npx tsc --noEmit` et `npm run build` réussis |
| Branche distante | `origin/import-seances-un-creneau` reçoit le correctif et les migrations 029 et 030 |

**Rien n'est appliqué à Supabase et rien n'est fusionné dans `main`.** La
migration 030 doit être appliquée avant de pouvoir valider ce choix avec les
données réelles. Le push GitHub n'a déclenché aucun aperçu Vercel : le tableau
de bord propose actuellement « Connect Git Repository ». L'ancien déploiement
automatique n'est donc plus actif, malgré ce qu'indique encore l'historique.

**Vercel vérifié en direct le 20 septembre dans le tableau de bord du compte :
aucun blocage de quota n'est affiché.** Le compte est en formule Hobby. Sur les
30 derniers jours : 20 builds terminés, 0 en erreur, 14 minutes de build plus
1 minute d'attente, 1 h 20 de CPU de build classée « Included », et 0 seconde de
minutes facturables. La production affichée date toujours du 9 septembre. Aucun
déploiement n'a été lancé pour ce contrôle.

Ordre de reprise :

1. Faire une sauvegarde fraîche.
2. Faire appliquer les migrations 029 et 030 par Claude.
3. Essayer le cas S4 / 18 septembre / S3 sur la classe de test.
4. Rétablir la connexion Git de Vercel ou lancer un aperçu manuel, puis contrôler
   le rendu sur ordinateur et téléphone.
5. Demander le feu vert de Christophe avant toute fusion ou publication en production.

La question séparée sur l'empreinte des documents reste ouverte avant la tâche 5.

## Point de reprise du 20/09/2026 : la tâche 4b est codée, la migration attend

Chantier repris après **11 jours d'arrêt** (dernier commit réel : le 9 septembre
au soir).

**Les portes sont ouvertes, sauf la dernière.** Les séances circulent maintenant
de l'IA jusqu'aux lignes prêtes à écrire en base. Ce qui a été fait, et comment
on sait que c'est vrai :

| Fait | La preuve |
|---|---|
| `lignesDepuisSemaines` dans `progression-seances.ts`, une seule construction pour les deux actions d'import | 5 tests neufs, `progression-seances.test.ts` : 127 verts |
| `progression-matiere.ts` et `progression-periode.ts` appellent cette fonction au lieu de recopier la construction | la construction dupliquée a disparu des deux fichiers |
| `nettoyerSemaines` et `normaliserSemaines` laissent passer les séances | 2 tests neufs dans `SourceImporter.test.tsx` : 28 verts |
| `aContenuSemaines` compte les séances (cinquième porte, voir plus bas) | le test « ne jette pas une semaine qui ne porte que des séances » passe |
| Toute la suite et TypeScript | `npx jest` : **888 tests, 75 suites, tout vert**. `npx tsc --noEmit` : muet |
| `029_remplacer_progression_seances.sql` écrite | `diff` du corps de fonction contre la migration 014 : **exactement les 3 ajouts prévus**, rien d'autre, branche `p_sync_semaines` intacte |

### Une cinquième porte, que le plan n'avait pas vue

Le plan listait quatre endroits. Il y en avait cinq. `aContenuSemaines`, dans
`SourceImporter.tsx`, décide si le document a du contenu **du tout** et ignorait
les séances. Conséquence concrète : un document dont les semaines ne portent que
des séances était déclaré vide, le bouton restait bloqué, et Cécile lisait
« Ajoute au moins une notion dans le contenu » alors que l'IA avait bien
travaillé. Trouvée parce que le test écrit pour la deuxième porte échouait en
n'enregistrant **rien**, au lieu d'enregistrer une semaine sans séances.

### Une conséquence vérifiée, et une question ouverte

La source enregistrée porte désormais `seances: []` sur chaque semaine. J'ai
vérifié que **cela n'invalide aucune empreinte existante** : `semainesPourEmpreinte`
dans `progression-sources.ts` projette explicitement `numero/items/pages/mots_exemple`
et ignore le reste. Quatre assertions de test ont été mises à jour en conséquence.

**Question laissée à Christophe** : du coup, l'empreinte d'une source ne tient
PAS compte des séances. Deux documents qui ne diffèrent que par leurs séances
ont la même empreinte, donc le second serait refusé comme doublon. Le corriger
veut dire changer la formule de l'empreinte, donc invalider toutes les empreintes
déjà en base. C'est un choix, pas un oubli : à trancher avant la tâche 5.

### Ce qui reste, dans l'ordre

1. **Appliquer la migration 029 en production** (étape 5 du plan). Écrite, pas
   appliquée : elle touche la base réelle, elle attend le feu vert de Christophe.
   Elle est compatible avec l'application actuellement déployée, qui n'envoie pas
   encore de séances (`coalesce` couvre le champ absent).
2. Faire un import réel sur la **classe de test** et vérifier en base qu'une
   ligne de `progression` porte enfin ses séances.
3. Lancer le remplissage de l'existant, `supabase/remplissage/028_remplir_seances.sql`,
   classe de test d'abord. **Toujours pas lancé.**
4. Trancher la question de l'empreinte ci-dessus.
5. Tâche 5, une séance par créneau.

**Note historique corrigée par le contrôle du 20 septembre ci-dessus** : le quota
Vercel n'affiche plus de blocage. Aucun déploiement n'a été tenté pendant ce contrôle.

---

## Point de reprise du 09/09/2026 au soir : DÉPLOYÉ, et la colonne est posée

Deux choses ont bougé le soir du 9 septembre.

**Un. Les 27 commits sont en ligne** (fusion `0d7f071` sur `main`, build Vercel
réussi). Cécile a le correctif du prénom, le bouton « Classer de A à Z », la
puce qui ne double plus, et LC et PDE affichés. Un mail le lui a dit le soir
même. Avant de déployer : sauvegarde complète de la base (24 tables, vérifiée),
877 tests et build avant ET après la fusion, et vérification que `vercel.json`
et sa route `/api/veille` survivaient à la fusion. Ils n’étaient pas sur la
branche : une fusion faite sans regarder les aurait supprimés en silence.

**Deux. La tâche 4 est coupée en deux, et la première moitié est faite**
(`f7eaa57`). La colonne `progression.seances` existe en production : jsonb,
`not null default '[]'`, 308 lignes à vide, aucune donnée existante touchée.
Le remplissage n’est PAS une migration : il vit dans
`supabase/remplissage/028_remplir_seances.sql`, se lance une classe à la fois,
regarde avant d’écrire, vérifie après, et ne retouche jamais une semaine qui a
déjà des séances. **La classe de test passe avant celle de Cécile.**

**La suite immédiate : la tâche 4b**, les trois portes entre l’IA et la base.
Sans elle, rien de ce chantier n’atteint l’écran de Cécile, et c’est aussi ce
qui le rend inoffensif en production aujourd’hui.

**Décision de cadrage prise le 9 septembre** : ne pas viser les douze tâches.
Faire la tranche 4, 4b et 5, qui suffit pour que l’import remplisse vraiment
ses créneaux, la laisser s’en servir, puis décider de la suite avec ses retours
plutôt qu’avec le plan écrit en août.

---

## Point de reprise du 09/09/2026, Cécile a répondu, LIRE EN PREMIER

**Les trois questions qui bloquaient ce chantier depuis le 3 septembre sont
tranchées.** Cécile a répondu le 9 septembre, après que le premier envoi soit
parti à une mauvaise adresse et se soit perdu trois jours.

| Sa question | Sa réponse | État |
|---|---|---|
| LC = Lecture compréhension ? | « tu peux laisser **LC** tout le temps », et **PDE** pour production d'écrits. Pas d'autres abréviations dans son manuel | **FAIT**, l'écran affiche toujours l'abréviation |
| Le domaine devant chaque séance ? | « **oui, sur chaque ligne** stp » | **RIEN À FAIRE**, c'est déjà le comportement, et ça confirme la décision de Christophe du 21/08 |
| Une séance « Jour 5 » dans une semaine à 4 jours ? | Option **a** : la mettre de côté dans une liste « à placer », elle la pose elle-même | **À FAIRE**, c'est le champ `origine` et les tâches 4, 5, 6, 9 et 12 |

### Sa demande spontanée, la plus précieuse, et elle est FAITE

> « Il faudrait pouvoir classer la liste des élèves par ordre alphabétique sans
> perdre les éléments déjà notés »

C'est le seul point qu'elle a soulevé d'elle-même, donc le seul dont on sait
qu'il la gêne vraiment. Ses 24 élèves suivaient l'ordre d'import.

En le traitant, **un défaut bien plus grave est apparu à côté** : l'identité
d'un élève était son PRÉNOM, et l'écran ne permettait pas de le corriger. Pour
réparer une faute de frappe, il fallait supprimer l'enfant et le retaper, ce qui
effaçait toutes ses observations, en silence. Corrigé : l'identité passe à
l'identifiant, le prénom se corrige d'un clic, et retirer un élève demande
confirmation.

### Ce qui est commité et poussé, et PAS déployé

| Commit | Ce qu'il apporte |
|---|---|
| `12aa015` | La puce n'est plus affichée en double quand le domaine est abrégé d'un seul côté (défaut 2, enfin fermé) |
| `15692e3` | Le bouton « Classer de A à Z » |
| `6e87700` | Corriger un prénom n'efface plus le suivi de l'élève |
| `75f8b40` | L'écran affiche LC et PDE |

**Rien n'est déployé, et c'est volontaire :** le quota Vercel de Christophe est
à 75 % et ne se remet à zéro qu'en octobre. On groupe, et on déploiera une
seule fois, quand le lot sera complet.

### OÙ LE CHANTIER S'ARRÊTE, et pourquoi

La suite, c'est la liste « à placer ». Elle n'est pas une tâche isolée : elle
se joue dans les tâches **4, 5, 6, 9 et 12**, et la tâche 4 est **une migration
de la base**.

**Cette migration ne doit pas partir avant une sauvegarde fraîche.** La
dernière date du 3 septembre, et Cécile travaille dedans tous les jours d'école
depuis. Christophe la refait dans une conversation dédiée : la base pèse
désormais 592 Ko une fois encodée, ce qui ne passe plus dans une session
entamée.

Et la consigne du 3 septembre tient toujours : la migration de la tâche 4
prévoyait un `update progression` **global**, qui toucherait les 154 semaines de
Cécile d'un seul coup. **La couper en deux** : la colonne d'abord, ce qui ne
touche à rien, puis le remplissage déclenché **classe par classe**, essayé sur
la classe de test avant d'atteindre la sienne.

---

## Point de reprise du 03/09/2026 — LIRE EN PREMIER, LE RESTE EST PÉRIMÉ

**Tout ce qui suit ce bloc décrit un état dépassé.** Les neuf corrections
annoncées plus bas comme « à faire » ont toutes été traitées par le commit
`ced1158` du 21 août au soir, que le fichier n'a jamais enregistré. Vérifié
point par point dans le code le 3 septembre. Ne les refais pas.

### Ce qui a changé le monde entre-temps

**Cécile travaille pour de vrai dans l'application depuis le 26 juillet.**
1 classe, 24 élèves, 90 créneaux d'emploi du temps, 154 semaines de progression
importées, et des observations qu'elle ajoute tous les jours d'école. Ce projet
n'est plus un bac à sable. Un défaut qui déforme une puce détruit son travail.

Trois protections ont été posées le 3 septembre :

| Protection | Où |
|---|---|
| Une sauvegarde complète de la base, vérifiée par empreinte | `Bureau\claude\_backups_ma-progression-cp\`, avec sa procédure |
| Un ping quotidien qui empêche la base de s'endormir | `/api/veille` sur `main`, commit `2f70c0f` |
| Une **classe de test**, copie fidèle de la sienne, élèves anonymisés | compte `christophe.mialon+test@gmail.com`, classe affichée « Bac a sable » |

**Développe sur la classe de test, jamais sur la sienne.** Attention à la
limite : la classe de test protège des bugs de code, **pas des migrations**. Le
schéma est commun aux deux. Voir plus bas, tâche 4.

### Les deux relectures de la tâche 2, enfin passées

Le commit `ced1158` disait lui-même « les deux relectures ne sont pas passées
dessus ». Elles ont été faites le 3 septembre.

**Conformité : conforme.** La décision de Christophe du 21/08 (le domaine reste
visible, la protection anti-doublon vient du code) est appliquée entièrement,
avec un test sur les 26 puces réelles du planning, cas Rimbaud compris. Six des
sept corrections obligatoires traitées, la septième l'était déjà avant.

Un seul écart, mineur et probablement hors périmètre : la consigne de borne du
jour met `jour` à null et signale dans `avertissements`, alors que la spec veut
garder la provenance (« Jour 5 ») pour l'afficher dans « à placer ». La séance
n'est pas perdue, seule l'étiquette d'origine l'est. **C'est le champ `origine`
de la tâche 6**, pas un défaut de la tâche 2.

**Qualité : deux défauts graves, tous deux REPRODUITS en exécutant le code.**

| | Défaut | État |
|---|---|---|
| 1 | Le texte de l'enseignante écrasé par la variante fautive du modèle dès que la séance porte un domaine. « Le graphème **où** » ressortait en « LC : Le graphème **ou** », un autre graphème du programme de CP, sans rien d'anormal à l'écran | **CORRIGÉ** le 03/09, commit `0edcb2d` |
| 2 | Une puce affichée **en double** quand le modèle nomme le domaine autrement dans `domaine` que dans `items` (« LC » contre « Lecture compréhension », ce que le document de référence fait d'une semaine à l'autre) | **CORRIGÉ** le 06/09, commit `12aa015`. `memePuce` tente un dernier rapprochement où chaque côté retire son propre domaine, à la seule condition que l'un soit exactement les initiales de l'autre. La décision du 21/08 tient : « Langage oral » donne « lo », donc le cas Rimbaud reste deux séances distinctes, verrouillé par un test. 836 tests verts|

**Pourquoi les 830 tests ne voyaient rien.** Les cinq tests qui protégeaient
cette zone utilisent tous un domaine **vide**, alors que le domaine rempli est
le cas normal depuis la décision du 21/08. Le trou de couverture était
exactement là où le commit avait changé le comportement. Trois tests à domaine
rempli ont été ajoutés (accent, casse, apostrophe).

**Leçon, la même qu'en août sous une autre forme :** un garde-fou peut cesser de
protéger sans qu'une seule de ses lignes ne change, parce que ce qui l'entoure a
bougé. Les tests qui le gardaient testaient un monde qui n'existait plus.

**Les deux défauts sont expliqués visuellement**, sur les vrais textes du
planning, dans une page faite pour Christophe le 03/09 :
https://claude.ai/code/artifact/9476d76e-0011-450f-9f75-880c3846cbff
Elle présente les deux chemins ci-dessous côte à côte, avec leur prix. C'est là
qu'il tranchera.

**Reprise prévue le matin du 4 septembre 2026.** Rien n'est en attente d'être
commité, tout est poussé.

### Le défaut 2, la décision qui attend Christophe

Deux chemins, le relecteur penche pour le premier :

1. **Ne plus coller le domaine au moment de la lecture**, seulement au moment de
   l'écriture (retirer `avecDomaine` de `seanceDepuisTexte`, le garder dans
   `itemsDepuisSeances`). La comparaison retrouve des libellés nus, le domaine
   atteint quand même l'écran. Prix : l'idempotence stricte dès le premier
   passage, dont le relecteur soutient vérification à l'appui qu'elle n'est pas
   réellement perdue.
2. **Rendre `memePuce` plus tolérante** : essayer aussi de retirer le domaine de
   chaque côté séparément, sans casser la distinction « LC : Voyelles » contre
   « PDE : Voyelles » qui est le cas de Christophe.

Trois avertissements plus légers ont aussi été relevés et restent ouverts : un
domaine qui serait lui-même un marqueur de jour (« Jour 2 ») contredit le champ
`jour` ; une case vide dont le modèle recopie le seul domaine passe le filtre
(« LC : » seul) ; et dans `itemsDepuisSeances` le domaine est posé avant la
lecture du préfixe, donc jamais pour le cas que son commentaire vise.

### La suite, dans l'ordre

1. Trancher le défaut 2, puis le corriger.
2. Essayer un vrai import sur la **classe de test**, avec un des PDF de Cécile.
3. Tâche 4b, puis tâche 4.

**Pour la tâche 4, une consigne qui n'était pas dans le plan :** sa migration
prévoit un `update progression` **global**, qui toucherait les 154 semaines de
Cécile. La couper en deux : la colonne d'abord, ce qui ne touche à rien, puis le
remplissage **déclenché classe par classe**, essayé sur la classe de test avant
d'atteindre la sienne. Et une sauvegarde juste avant, dans tous les cas.

---

## Point de reprise du 20/08/2026 (PÉRIMÉ, gardé pour l'historique)

Chantier repris ce jour après deux semaines d'arrêt (dernier commit réel : le
6 août, tâche 1 approuvée avec 5 restes mineurs). Christophe : « c'est le
bordel et pas normal, il faut me rappeler ce genre de chose ». Un chantier
oublié se signale désormais tout seul, voir
`.claude/rules/signaler-chantiers-abandonnes.md` dans le dépôt MON AIOS.

**Fait dans la journée du 20/08 :**

1. Les 5 restes mineurs de la tâche 1 (détail plus bas, section devenue
   « TOUS TRAITÉS »). Commité : `99684c7`. La branche n'est toujours pas
   poussée, `main` reste intact.
2. La **tâche 2** implémentée en sous-agent, puis relue deux fois. Conformité :
   approuvé. Qualité : **RÉSERVES**, dont deux défauts qui auraient abîmé de
   vraies données. Une passe de correction est en cours, **rien n'est commité**.
3. Une **tâche 4b** ajoutée au plan, elle n'y était pas (voir plus bas).

## ARRÊT DU 21/08 : UNE QUESTION EN ATTENTE DE CHRISTOPHE

Le chantier s'arrête ici pour raison de quota. **Tout est commité sur la
branche** (travail en cours, défauts connus listés ci-dessous), rien n'est
poussé, `main` reste intact.

### QUESTION TRANCHÉE PAR CHRISTOPHE LE 21/08

**Le domaine reste visible dans le cahier journal.** On garde
« LC : La petite poule (séance 1) », pas « La petite poule (séance 1) ».

Sa raison, et elle est décisive : dans son planning, deux séances portent le
même texte de Rimbaud, l'une en langage oral, l'autre en production d'écrits.
Sans le préfixe, les deux lignes sont identiques à l'écran et on ne sait plus
laquelle est laquelle. `LC` = lecture compréhension, `PDE` = production
d'écrits, ce sont les abréviations du manuel, pas des inventions du code.

**Ce que ça implique pour la correction :** la consigne ajoutée au prompt qui
demande à l'IA de ne pas recopier le domaine devant le texte des `items` doit
être **retirée**. Le domaine doit survivre jusqu'à l'écran. Attention, c'est
cette consigne qui avait été ajoutée pour supprimer les doublons : la
protection contre le doublon doit donc venir du **code** (comparaison
tolérante), pas d'une interdiction faite au modèle.

C'était un choix produit, pas technique. La
consigne actuelle demande à l'IA de ne plus écrire le domaine devant le texte.
Conséquence mesurée sur son vrai `partage/exemple de planning p1.pdf` :
« Langage oral : Voyelles de Rimbaud » et « PDE : Voyelles de Rimbaud »
deviennent **deux lignes identiques à l'écran**, alors que le domaine était
justement ce qui les distinguait.

### Les deux bloquants de la quatrième relecture

1. **Le domaine disparaît de l'écran** (ci-dessus). Le prompt a échangé un
   doublon contre une perte.
2. **Une puce peut être remplacée par une autre.** Si l'IA rate un accent, le
   code garde sa version fautive au lieu du texte correct de l'enseignante :
   « Le graphème où » devient « Le graphème ou », qui est un autre graphème du
   programme de CP. Réparation indiquée par le relecteur : à correspondance
   tolérante mais non identique, préférer le texte de l'item, et ne garder le
   plus long que s'il contient l'autre.

### Les corrections à faire dans tous les cas

| Quoi | Où |
|---|---|
| L'apostrophe typographique n'est pas normalisée | le document de référence écrit « Geste d'écriture » ainsi **six fois**, chaque occurrence produit un doublon |
| Le créneau vide est encore atteignable | quand tous les items d'une semaine se réduisent à un préfixe |
| Intervalle + jour rendu par l'IA | la puce apparaît deux fois, dont une amputée |
| `cahier-journal.ts` déforme encore | il applique la regex de préfixe brute ; correctif de trois lignes, ne pas attendre la tâche 5 |
| **Un tour de chat IA efface tous les `domaine`** | `CHAT_SCHEMA` ne connaît pas `seances` ; à corriger avant la tâche 5 |
| `max_tokens` à 16000 | un import de 36 semaines arrive à 1 % du plafond, l'année entière ne passera pas |
| La consigne de borne du jour contredit la spec | elle demande d'effacer un jour hors semaine, la spec veut le garder et le signaler |

### Ce que les relecteurs ont attaqué sans réussir à casser

Utile à savoir pour ne pas re-vérifier : aucun quatrième chemin ne déforme le
préfixe, le garde-fou d'intervalle tient sur 26 écritures, aucune puce n'est
perdue par comptage, la règle « le texte du document gagne » tient sur tous les
conflits construits, rien ne diverge sans borne sur 5 passages, et la tolérance
n'avale ni une troncature ni une distance d'édition.

---

**Troisième passe, nuit du 20 au 21/08.** La correction a fermé les trois
défauts de la deuxième passe (vérifié en exécutant le code, pas en le lisant),
mais les deux nouvelles relectures ont trouvé deux bloquants de plus, et elles
se rejoignent sur le second :

| Défaut | Ce qui se passe |
|---|---|
| Le garde-fou des intervalles ne couvre qu'un chemin sur deux | dès que le modèle remplit `jour` lui-même, « Jours 3-4 » redevient « Jour 3 : 4 », et le nombre d'items **croît sans borne** à chaque passage |
| Le code exige du modèle une identité au caractère près | un point final ou un accent en trop, et l'apprentissage apparaît **deux fois**. Une consigne préexistante du prompt pousse même à écrire les deux champs différemment. C'est « les maths en triple » du 26/07 qui revient |
| Une case vide du planning fabrique un créneau vide | et un commentaire affirme faussement que ce cas est gardé |

**La leçon de fond, qui vaut pour la suite du chantier** : le code exigeait du
modèle une perfection que le prompt ne lui demandait nulle part. La troisième
passe change d'approche, elle rend le code **tolérant** (casse, accents,
ponctuation, préfixe de domaine) au lieu d'espérer que le modèle soit parfait.
Ne pas revenir en arrière là-dessus.

Le relecteur qualité a ouvert `partage/exemple de planning p1.pdf`, le vrai
document, pour trancher : **celui-là passe**, ses domaines sont écrits dans la
puce. C'est une mise en page à colonne de domaine qui casserait.

**Ce que la relecture qualité a trouvé, et qu'il ne faut pas reperdre :**

| Défaut | Pourquoi ça compte |
|---|---|
| `items` écrasé dès qu'une seule séance est rendue | 4 puces en entrée, 1 en sortie : du contenu du manuel disparaît |
| « Jours 3-4 : révisions » ressort « Jour 3 : 4 : révisions » | le texte de l'enseignante est déformé à l'écran et en base |
| La tâche 3 vise `systemImportPeriode`, **fonction morte** | la vraie fonction vivante est `systemImportAutomatique` ; sans ça, le modèle doit remplir un champ que personne ne lui explique |
| Un test qui compare le code à lui-même | il resterait vert si la règle devenait fausse |

**À faire au prochain démarrage, dans l'ordre :**
1. Vérifier l'état : `npx jest` et `npx tsc --noEmit` (muet). Références avant
   la passe de correction : 71 suites, 702 tests.
2. Reboucler les **deux relectures** sur la correction, puis committer la
   tâche 2 et la tâche 3 (avancée exprès, voir le tableau).
3. Enchaîner sur la tâche 4, puis la **4b**.
4. Modèle pour l'orchestration et les relectures : le plus capable disponible
   (Opus), pas seulement Sonnet. Ce chantier a un historique de bugs subtils
   que seule la relecture qualité attrape, deux fois sur deux maintenant.

Un doublon sans conséquence traîne sur cette branche : un commit "Installe
Graphify" (`baf7fd0`) qui aurait dû rester sur `main` uniquement. Il a été
recopié proprement sur `main` (`fc4c017`), celui-ci peut être ignoré ou
nettoyé à l'occasion, ça ne bloque rien.

---

Point de reprise du chantier lancé le 03/08/2026. Branche `import-seances-un-creneau`.

- Spec : `docs/superpowers/specs/2026-08-03-import-seances-un-creneau-design.md`
- Plan : `docs/superpowers/plans/2026-08-03-import-seances-un-creneau.md` (12 tâches)

Exécution en sous-agents : un implémenteur par tâche, puis une relecture de
conformité à la spec, puis une relecture de qualité, avec boucle de correction
tant qu'un relecteur a des réserves.

## État des tâches

| # | Tâche | État |
|---|---|---|
| 1 | Conversions séances et items | ✅ terminée et **approuvée** en relecture, `4f4ff70` |
| 2 | L'IA rend des séances | codée et commitée (`ced1158`), **les deux relectures sont passées le 03/09** : conforme, un défaut grave corrigé (`0edcb2d`), un second **ouvert**, voir le point de reprise en tête |
| 3 | Les consignes d'import | **avancée** au 20/08 : le schéma exige `seances` sans que le modèle sache quoi y mettre. Visait une fonction morte, corrigée sur `systemImportAutomatique` |
| 4 | La colonne en base et son remplissage | **colonne POSÉE le 09/09** (`f7eaa57`, migration 028 appliquée en production, 308 lignes à vide, rien de modifié). Le **remplissage reste à lancer**, classe par classe, voir `supabase/remplissage/028_remplir_seances.sql` |
| 4b | Les trois portes fermées entre l'IA et la base | **CODÉE le 20/09** : il y avait en fait CINQ portes. Tests, suite complète et `tsc` verts. La migration **029 est écrite mais PAS appliquée**, voir le point de reprise en tête |
| 5 | Une séance par créneau | faite puis REMPLACÉE par le placement par le sens (17/10, voir « Avancement du 17/10 ») |
| 6 | La sauvegarde conserve « à placer » | faite (17/10) |
| 7 | Les deux garanties sur le lundi réel | revue avec les réponses de Cécile (18/10, point de reprise de l'après-midi) |
| 8 | Le planning réel des Petites Poules | fait (17/10) |
| 9 | Afficher « à placer » dans le cahier journal | faite (17/10) |
| 10 | Vérifier l'import jour par jour | à faire |
| 11 | Déplacer une séance d'un jour à l'autre | à faire |
| 12 | Poser une séance « à placer » dans un créneau | à faire (le point du 18/10 après-midi ne cite que 10 et 11 : à vérifier) |

*Tableau corrigé le 18/10 au soir : il disait encore « à faire » pour 5 à 9.*

## Ce que la tâche 1 a appris, et qui vaut pour la suite

**La relecture qualité a trouvé deux bugs dans le code que le plan lui-même
donnait.** La conformité à la spec ne suffit donc pas : la spec peut être fausse.

1. `'Jour 0 : Rentrée'` perdait son texte à l'aller-retour, parce que le préfixe
   était retiré alors que le numéro était rejeté. La migration SQL de la tâche 4
   s'appuie sur cette équivalence exacte : la base aurait divergé de l'application
   en silence.
2. `itemsDepuisSeances` doublait le préfixe quand le libellé en portait déjà un.
   Ce n'est pas théorique : c'est l'IA qui remplira le jour ET le libellé, et un
   modèle recopie volontiers la puce entière.

**Contrat JS / SQL à respecter en tâche 4.** La grammaire du préfixe n'est pas
identique dans les deux langages, et la divergence est silencieuse :

- insensibilité à la casse (`~*` côté Postgres) ;
- cinq séparateurs acceptés, dont deux tirets Unicode ;
- `\s` en JavaScript couvre l'espace insécable U+00A0, alors que `[[:space:]]`
  côté Postgres ne le couvre en général pas. Un item collé depuis Word avec un
  espace insécable en tête serait lu par l'application et pas par la migration ;
- la borne de longueur du domaine.

Cette grammaire est documentée en commentaire dans `src/lib/progression-seances.ts` :
la migration doit la copier, pas la réinventer.

**Décisions prises en cours de route** (à défaire seulement en connaissance de cause) :

- un jour n'est retenu que s'il est un entier strictement positif, et le préfixe
  n'est retiré du libellé QUE dans ce cas ;
- un `null` ou un `undefined` dans `items` est filtré comme une entrée vide, mais
  un nombre est conservé sous sa forme texte. Le critère : aucun texte écrit par
  l'enseignante ne doit disparaître, mais un `null` n'est rien qu'elle ait écrit ;
- `PREFIXE_JOUR` est exporté par `progression-seances.ts` et importé par
  `cahier-journal.ts` : une seule définition, pas deux qui dérivent.

## Comment reprendre

**Réécrit le 03/09. L'ancienne version envoyait refaire cinq restes traités
depuis le 20 août et annonçait 697 tests là où il y en a 833.**

1. Se placer sur la branche `import-seances-un-creneau`. Elle n'est pas fusionnée
   dans `main`, `main` est intact, et depuis le 03/09 elle est **poussée sur
   GitHub** : ses commits n'existent plus seulement sur le PC de Christophe.
2. Vérifier l'état : `npx jest` doit donner **72 suites et 833 tests verts**, et
   `npx tsc --noEmit` doit être muet.
3. Lire le point de reprise du 03/09 en tête de ce fichier : il dit ce qui reste
   réellement ouvert. Ne pas se fier aux sections d'août, elles sont périmées et
   marquées comme telles.
4. Se connecter à l'application avec le **compte de test**, jamais avec celui de
   Cécile, et travailler sur la classe affichée « Bac a sable ».
5. Garder la méthode qui a payé : un implémenteur par tâche, puis une relecture
   de conformité à la spec, puis une relecture de qualité, avec boucle de
   correction tant qu'un relecteur a des réserves. Le 03/09, c'est elle qui a
   attrapé un défaut que 830 tests verts laissaient passer.

La leçon de la tâche 1 vaut consigne : **ne pas faire confiance au texte du plan
comme s'il était juste.** Ses blocs de code sont des propositions relues par
personne au moment où ils ont été écrits.

## Restes mineurs de la tâche 1 — TOUS TRAITÉS le 20/08/2026

Les cinq points ci-dessous sont faits, vérifiés (71 suites, 698 tests verts,
`tsc --noEmit` muet), pas encore commités. Voir la section « Point de reprise
du 20/08 » plus bas avant de continuer.

1. ✅ `aTexte` (`progression-seances.ts`) ne convertit plus que `number`,
   `boolean`, `bigint` en texte ; un objet ou un tableau devient `''` au lieu
   de `'[object Object]'`.
2. ✅ Docstring de `domaine` (`types/index.ts`, type `SeanceProgression`) :
   dit maintenant explicitement que le champ est dérivé et jamais resérialisé.
3. ✅ Docstring de `itemsDepuisSeances` : dit que `jour` gagne toujours en
   silence sur un préfixe texte contradictoire.
4. ✅ Nouvelle fonction exportée `estJourValide(n: number): boolean` dans
   `progression-seances.ts`, seule définition de la règle. `jourValide`,
   l'inline de `seancesDepuisItems`, et `numeroJourItem` (`cahier-journal.ts`)
   s'appuient dessus au lieu de la redéfinir chacun.
5. ✅ Nouveau test dans `progression-seances.test.ts` : l'espace insécable
   est placé ENTRE "Jour" et le numéro, pas seulement en tête (l'ancien test
   ne prouvait rien au-delà de `trim()`). L'ancien test reste, inchangé.

## Point d'attention pour la tâche 7

La fixture du lundi réel de Christophe porte des items datés SANS colonne
`seances`. Après la migration la base en aura, donc la fixture doit en avoir
aussi, et **les attentes du français vont changer**. Ces nouvelles valeurs sont à
faire valider par Christophe, jamais à aligner en silence. Si un créneau de maths
ou d'EMC bouge, c'est une régression, pas une attente à mettre à jour.

## CADRAGE DE L'ÉCRAN D'ACCOMPAGNEMENT IA (18/10, en cours, skill brainstorming)

Réponses de Christophe, au fil de l'eau :
1. Le « tableau » construit avec l'enseignante = des **règles par type** (« Vocabulaire va dans Étude de la langue »), une quinzaine de lignes, construites une fois, réutilisées à chaque import ; l'IA ne redemande que pour un type jamais vu. Pas une case par séance.
2. Ces règles valent pour **toutes les matières** (français, maths, EMC, arts ; ex. « Chant » vers « Musique » chez Cécile).
Constat : aujourd'hui l'IA d'import ne voit PAS l'emploi du temps.
3. Elle voit et corrige ces règles à **trois endroits** : à l'import (types nouveaux seulement), dans Paramètres (« Mon rangement »), et depuis le cahier journal (« toujours mettre la Fluence dans Ateliers ? »).
4. Document sans jour : **la règle porte aussi un jour préféré** (« Fluence : Ateliers de français, le jeudi ») ; sans jour préféré, première case de ce type dans la semaine. L'IA propose les jours en lisant l'emploi du temps.
5. Le tableau appartient **à chaque classe** (les noms de cases diffèrent d'une classe à l'autre ; plus tard, « reprendre le tableau d'une autre classe »).
6. Dialogue : l'IA **propose le tableau rempli, puis pose 1 à 3 questions** à choix sur le même écran pour ce dont elle doute ; une seule validation (Valider / Plus tard).
7. Approche **A** retenue : les règles s'appliquent quand le cahier journal se fabrique (corriger une règle suffit, pas de réimport, les données de Cécile marchent telles quelles). Ordre de consultation : règles, puis rangement automatique actuel, puis « à placer ».
Découpage proposé (en attente de validation) : 1 table de règles + Paramètres « Mon rangement » (sans IA) ; 2 « toujours ? » depuis le cahier journal (sans IA) ; 3 l'IA construit le tableau à l'import (Sonnet, une fois) ; 4 l'IA donne un type aux lignes sans type (Haiku, un appel par document), remplace l'option B.
8. Christophe (18/10) : « que ce soit à ce niveau ou à l'import quand on propose à l'utilisateur, s'il ne valide pas il faut l'aider à construire sa solution ». Donc chaque proposition = Oui / **Autrement** (l'appli l'accompagne pour construire SA règle) / Plus tard. Un refus n'est jamais un cul-de-sac. (Ordre des étapes 1-2-3-4 pas encore confirmé.)
9. « Autrement » = **elle le dit avec ses mots** (« chez moi la fluence c'est le vendredi en APC ») ; l'IA légère en fait une règle et la montre (« J'ai compris : Fluence -> APC, le vendredi » ; C'est ça / Non, je réexplique). Si la case n'existe pas, l'IA le dit et propose la plus proche. (Christophe n'a retenu que cette option, pas la liste de cases ni « ça dépend » ni créer la case.)
10. Plan validé par Christophe (« ok, le plan me va ») : carnet de rangement d'abord (étape 1), puis « Toujours ? » + « Autrement » avec ses mots depuis le cahier journal (2), l'IA propose le carnet à l'import (3), lignes sans type (4). Écrans présentés le 18/10 (Paramètres « Mon rangement », bandeau « Toujours ? » du cahier journal, bloc « Ton rangement » à l'import), validation en attente.
11. Les trois écrans validés par Christophe (maquettes du 18/10) : Paramètres « Mon rangement » (type, case, jour, Modifier, « Ajouter une règle avec mes mots ») ; bandeau du cahier journal (Oui, toujours / Autrement / Juste cette fois, puis « J'ai compris : ... » C'est ça / Je réexplique) ; bloc d'import « Ton rangement » (types nouveaux, Oui / Autrement, une question à choix, Valider mon rangement / Plus tard).
12. **Document de conception VALIDÉ par Christophe le 18/10** : `docs/superpowers/specs/2026-10-18-carnet-de-rangement-design.md` (commit `6007dd9`). Suite : plan de l'étape 1 (skill writing-plans) dans une session neuve.
    **Plan de l'étape 1 ÉCRIT le 18/10** : `docs/superpowers/plans/2026-10-18-carnet-de-rangement-etape-1.md`, 13 tâches (migration 031, logique pure, notions, cahier journal, lecture tolérante du carnet, actions, appel IA `ia-regle` sur Haiku 5.5 vérifié à 0,10 $ / 0,50 $ le million de jetons, composant « avec mes mots », section « Mon rangement », vérification finale). Rien de codé. Attend l'accord de Christophe : appliquer la migration 031 en base (sans effet pour Cécile tant que son carnet est vide), puis l'essai réel sur Bac a sable.
