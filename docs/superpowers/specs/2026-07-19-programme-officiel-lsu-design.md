# Spec : Alignement au programme officiel + LSU

Date : 19 juillet 2026
Statut : cadrage (à valider par Christophe avant implémentation)
Contexte : demande de Christophe le 19/07 ("respecter le programme officiel",
"c'est téléchargeable, recherche", "cadre fait au mieux"). Complète
`docs/STRATEGIE-N1-MARCHE.md` (§8, manque d'alignement B.O.) et
`docs/REPRISE-OPUS-2026-07-05.md` (§2.2, exemple LSU).

## 1. Objectif

Relier la progression de l'enseignante (construite à partir de SON manuel) au
référentiel officiel (attendus de fin d'année CP, éduscol), et permettre de
pré-remplir le livret LSU (positionnement en 4 niveaux par période).

Sans perdre le wedge unique : **l'IA lit TON manuel**. On ne remplace pas cette
approche, on ajoute par-dessus une couche "compétences officielles" qui coche
l'argument "aligné programme officiel" (parité Teetsh / Fiche Séquence) et ouvre
le LSU (table-stakes du marché).

## 2. Sources officielles (téléchargeables)

- **Attendus de fin d'année CP** (éduscol), en PDF, pour français et maths :
  - Français : `eduscol.education.gouv.fr/sites/default/files/document/01-francais-cp-attendus-eduscol1114731pdf-74619.pdf`
  - Maths : `eduscol.education.gouv.fr/sites/default/files/document/02-maths-cp-attendus-eduscol1114732pdf-74622.pdf`
  - Page repères annuels : `eduscol.education.gouv.fr/6910`
  - Nouveaux programmes cycle 2 en vigueur depuis la rentrée 2025.
- **LSU** (livret scolaire unique) : structure officielle = par **domaine
  d'enseignement** -> "principaux éléments du programme travaillés durant la
  période" -> **positionnement en 4 niveaux** : Non atteints / Partiellement
  atteints / Atteints / Dépassés. (Conforme au `news/exemple lsu.pdf` fourni par
  Cécile.)

Note : ce sont des PDF texte, pas un jeu de données structuré. On les structure
UNE FOIS avec l'IA de l'appli (même pipeline que l'import d'un manuel), puis on
stocke le référentiel en base (versionné, partagé par toutes les classes).

## 3. Domaines officiels (structure connue, à figer depuis les PDF)

- **Français** : Langage oral ; Lecture et compréhension de l'écrit ; Écriture ;
  Étude de la langue (grammaire, orthographe, lexique).
- **Mathématiques** : Nombres et calculs ; Grandeurs et mesures ; Espace et
  géométrie ; Organisation et gestion de données.

Le libellé exact de chaque attendu sera extrait des PDF éduscol à
l'implémentation (Phase 1) et vérifié à la main.

## 4. Principe de conception

1. **Référentiel officiel = donnée partagée**, pas par utilisateur. Une seule
   fois : import des PDF -> structuration IA -> table `competences_officielles`.
2. **Le manuel reste la porte d'entrée.** L'enseignante importe sa méthode
   (inchangé). En plus, l'IA **suggère** pour chaque notion de la progression la
   ou les compétences officielles correspondantes. Suggestion **éditable** :
   l'enseignante garde la main.
3. **Le LSU se déduit du suivi existant.** Le suivi actuel (étoiles / statut par
   notion) s'agrège par domaine et par période pour proposer un positionnement
   4 niveaux, que l'enseignante ajuste, puis exporte au format LSU.
4. **RGPD inchangé** : aucun prénom d'élève n'est envoyé à l'IA (placeholder
   `[ELEVE]`), y compris pour tout ce module.

## 5. Modèle de données (migrations versionnées)

- `competences_officielles` (partagé) : `id`, `cycle` (2), `niveau` (CP),
  `matiere` (francais|maths|...), `domaine`, `code`, `libelle`, `source`,
  `version_programme` (ex : "2025").
- Lien notion <-> compétence : `progression_competences` : `progression_id`
  (ou `class_id` + `matiere` + `numero`), `competence_id`, `origine`
  (ia_suggeree|validee_enseignant).
- Positionnement LSU : `bilan_lsu` : `class_id`, `eleve_id`, `periode` (P1..P5),
  `domaine`, `niveau` (non_atteint|partiel|atteint|depasse), `commentaire`,
  `updated_at`.

Rien ne casse l'existant (`semaines`, `progression`, `acquisitions`,
`appreciations` restent). On ajoute uniquement.

## 6. Rôle de l'IA (côté serveur, clé du produit)

- **Structurer** les attendus officiels (PDF -> compétences) : une fois, à
  l'implémentation.
- **Suggérer** le mapping notion de la progression -> compétence(s) officielle(s).
- **Agréger** le suivi par domaine/période -> proposition de niveau LSU +
  amorce de commentaire (prénom jamais transmis).

## 6 bis. Mise à jour annuelle du référentiel (pensée long terme)

Exigence de Christophe (19/07) : **le programme officiel évolue chaque année**,
il faut pouvoir **re-télécharger la version à jour** sans redévelopper.

Conception en conséquence :
- Le référentiel n'est **jamais figé dans le code**. Il vit en base
  (`competences_officielles`) avec un champ **`version_programme`** (ex :
  "2025", "2026") et une **date de source**.
- Un **script/outil d'administration réimportable** : on lui donne les URL (ou
  les PDF) des attendus officiels de l'année, il les fait structurer par l'IA,
  crée une **nouvelle version** du référentiel (les anciennes sont conservées
  pour l'historique et les bilans déjà produits).
- Une classe **pointe vers une version** du référentiel (celle de son année
  scolaire). Changer d'année = pointer vers la nouvelle version, sans casser les
  données passées.
- Les URL éduscol peuvent changer d'une année à l'autre : l'outil accepte donc
  aussi un **dépôt manuel de PDF** (au cas où le lien bouge), pas seulement une
  URL en dur.
- Idéalement, une **vérification annuelle** (rappel / tâche planifiée) signale
  qu'une nouvelle version du programme est parue et propose de la réimporter.

En clair : la mise à jour du programme est une **opération de données
répétable**, pas une modification de code. C'est ce qui rend le produit durable.

## 7. Parcours utilisateur (fluide, jamais bloqué)

- **Point d'entrée** : réutiliser ou compléter le panneau "Mes outils IA" de
  l'accueil. Ajouter un accès clair type "📋 Livret / compétences officielles"
  qui mène à la vue période -> domaine -> élèves. (Décision UI à confirmer :
  réutiliser un des 2 boutons actuels ou en ajouter un 3e.)
- **Vue compétences** : dans la fiche d'une semaine (ou d'une période), afficher
  discrètement la ou les compétences officielles rattachées à chaque notion
  (badge), pour montrer l'alignement sans surcharger.
- **Vue LSU** : par période, un tableau domaine x élève avec les 4 niveaux
  pré-remplis (modifiables), puis export (PDF au format LSU, réutilise le moteur
  d'export existant).
- Respect de la règle d'or : tout accessible en 1-2 clics, pas de long
  défilement, pas de blocage.

## 8. Découpage en phases

- **Phase 1 — Référentiel + affichage.** Import + structuration des attendus
  officiels ; table `competences_officielles` ; affichage "compétence officielle"
  par notion. Livre déjà l'argument "aligné programme officiel".
- **Phase 2 — Mapping IA + validation.** Suggestion IA notion<->compétence,
  éditable par l'enseignante ; stockage du lien.
- **Phase 3 — Bilan par période + export LSU.** Agrégation 4 niveaux par domaine
  et période, ajustement, export au format LSU.

## 9. Synergies avec les autres chantiers

- **Périodes P1-P5 (demande de Cécile)** : le LSU se remplit PAR PÉRIODE. Passer
  la progression d'un modèle "36 semaines à plat" à un modèle "5 périodes"
  sert les DEUX chantiers. À traiter ensemble ou en amont.
- **Mise en forme EDT / APC** : indépendants, non bloquants pour ce chantier.

## 10. Décisions prises ("fait au mieux") et questions ouvertes

Décidé par défaut (modifiable) :
- Référentiel officiel stocké en base, partagé, versionné (pas par utilisateur).
- Mapping IA = suggestion éditable, jamais imposé.
- 4 niveaux officiels : Non atteint / Partiellement atteint / Atteint / Dépassé.

Tranché par défaut le 19/07 ("fait au mieux", délégué par Christophe) :
1. **Point d'entrée UI** : on **ajoute** un 3e accès dans "Mes outils IA"
   ("📋 Compétences & livret"), sans sacrifier les 2 boutons existants. Fluide.
2. **Ordre** : on livre d'abord le **référentiel officiel + affichage** (Phase 1,
   additif, sans risque), puis le passage aux **périodes P1-P5** (fondation, sert
   aussi Cécile), puis le mapping IA, puis le bilan/export LSU. On front-load la
   valeur "aligné programme officiel" sans toucher tout de suite au cœur.
3. **Périmètre Phase 1** : **français + maths** (les deux qui ont des attendus
   officiels PDF). Autres matières après.
4. **Export LSU** : PDF "façon LSU" pour la beta. L'import dans l'outil LSU
   officiel de l'État = phase ultérieure (habilitation requise).

## 12. Prérequis de sécurité AVANT d'implémenter (bloquant)

Ce chantier ajoute des **tables** à la base. Or, règle de sécurité du projet
(REPRISE §4 + mémoire `project_schema_prod_drift`) : **la prod a déjà été perdue
une fois**, et il n'existe toujours **ni sauvegarde récente des données de
Cécile, ni projet Supabase de TEST**. Cécile teste EN CE MOMENT sur la prod.

Donc, avant toute migration :
1. **Sauvegarde** des données de Cécile (`pg_dump` / export).
2. **2e projet Supabase gratuit de TEST** pour développer les migrations sans
   risque, puis appliquer à la prod une fois validé.

Les fichiers de migration peuvent être **écrits** dès maintenant (sans être
appliqués). Mais on ne touche PAS la base de prod tant que 1 et 2 ne sont pas
faits. C'est la seule décision que je ne prends pas seul : elle engage les
données réelles de Cécile.

## 13. Modèle métier de référence (doc Christophe "Construire une année")

Document fourni par Christophe (partage/ "Construire une année en tant que
professeur des écoles.pdf") : décrit le workflow officiel d'un PE. Il valide et
structure toute la roadmap :

1. **Programme** officiel (par cycle : C1 PS-GS, C2 CP-CE2, C3 CM). Les liens
   officiels y sont ; programmes "en cours de changement" -> confirme le besoin
   d'un référentiel VERSIONNÉ et réimportable.
2. **Progression** par domaine : l'ordre des apprentissages (avec ou sans méthode).
3. **Programmation** : la progression **découpée en fonction des 5 périodes** de
   l'année, en tenant compte du **nombre de semaines de chaque période**.
4. **Emploi du temps** : construit selon le **volume horaire** de chaque domaine
   (récréations 30 min/j en C2/C3 à répartir). -> alimente le **cahier journal**.

Implications pour le produit :
- Le triptyque **Programme -> Progression -> Programmation (5 périodes)** est la
  colonne vertébrale. Le passage "36 semaines à plat" -> "5 périodes" n'est pas
  une option, c'est le modèle métier. Il sert Cécile (import 5 docs), le LSU
  (bilan par période) et la crédibilité.
- À terme, l'emploi du temps devrait intégrer le **volume horaire par domaine**.
- Modèle transposable à **tous les cycles** (PS->CM2), coche l'extension de marché.

### Volume horaire officiel cycle 2 (CP-CE1-CE2) — arrêté 9/11/2015

Récupéré via recherche (les pages HTML education.gouv/eduscol bloquent l'accès
automatisé en 403 ; les PDF d'attendus, eux, se téléchargent directement).

| Domaine | Par semaine | Par an |
|---|---|---|
| Français | 10 h | 360 h |
| Mathématiques | 5 h | 180 h |
| Questionner le monde (dont EMC) | ~2 h 30 | 90 h |
| Éducation physique et sportive | 3 h | 108 h |
| Enseignements artistiques (arts plastiques + musique) | 2 h | 72 h |
| Langue vivante | 1 h 30 | 54 h |
| EMC (inclus dans Questionner le monde) | ~1 h | 36 h |

Total 24 h/semaine, dont ~2 h de récréation (30 min/jour) à répartir sur les
domaines. Ces volumes serviront à générer/valider l'emploi du temps.

### Domaines cycle 2 (pour étendre le référentiel au-delà de français/maths)

Français, Mathématiques, Questionner le monde, EMC, EPS, Enseignements
artistiques, Langue vivante. Chaque domaine a ses attendus de fin d'année en PDF
sur éduscol (téléchargeables comme français/maths). Phase 1 a fait
français + maths ; les autres s'ajoutent par le même procédé.

## 14. Module APC / 108 heures (doc "les 108h")

Spec fournie (partage/ "les 108h _.docx"), recoupe REPRISE §2.1. Indépendant de
ce chantier mais à garder en vue :
- 108h = 6h conseils d'école + 36h APC + 18h formation + 48h travail d'équipe
  (prépa APC, équipe éducative, conseil de cycle, RDV parents...).
- Besoin : un **récapitulatif APC** (quel élève, quelle date, quelles compétences
  travaillées, résultat) + un **calcul des heures** par catégorie.
- Synergie : "compétences travaillées en APC" = lien vers le référentiel officiel
  (Phase 1) et vers le suivi élève. RGPD : prénom jamais envoyé à l'IA.

## 11. Hors périmètre (pour éviter le scope creep)

- Habilitation ministérielle pour l'export LSU "officiel" réel (phase ultérieure,
  cf. STRATEGIE §4).
- Import ONDE (n° INE).
- Niveaux autres que CP (PS->CM2 = chantier séparé).
