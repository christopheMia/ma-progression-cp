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

À trancher avec Christophe :
1. Point d'entrée UI : réutiliser un bouton "Mes outils IA" ou en ajouter un ?
2. On lie d'abord les **périodes P1-P5** (utile aussi pour Cécile) avant le LSU,
   ou on garde les 36 semaines et on mappe les périodes par-dessus ?
3. Périmètre Phase 1 : français + maths seulement, ou aussi les autres matières
   (EMC, Questionner le monde…) dès le départ ?
4. Export LSU : PDF "façon LSU" (rapide) suffit pour la beta, ou viser plus tard
   l'import dans l'outil LSU officiel de l'État (gros, phase ultérieure) ?

## 11. Hors périmètre (pour éviter le scope creep)

- Habilitation ministérielle pour l'export LSU "officiel" réel (phase ultérieure,
  cf. STRATEGIE §4).
- Import ONDE (n° INE).
- Niveaux autres que CP (PS->CM2 = chantier séparé).
