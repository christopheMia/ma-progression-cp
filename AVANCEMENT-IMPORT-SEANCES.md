# Avancement : une séance du document, un créneau du cahier journal

## Point de reprise du 20/08/2026 — LIRE EN PREMIER

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

### La question à lui poser en premier au redémarrage

**Dans le cahier journal, veut-il voir « LC : La petite poule (séance 1) » ou
juste « La petite poule (séance 1) » ?**

C'est un choix produit, pas technique, et il commande la correction. La
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
| 2 | L'IA rend des séances | codée, **en correction** après relecture qualité, non commitée |
| 3 | Les consignes d'import | **avancée** au 20/08 : le schéma exige `seances` sans que le modèle sache quoi y mettre. Visait une fonction morte, corrigée sur `systemImportAutomatique` |
| 4 | La colonne en base et son remplissage | à faire |
| 4b | Les trois portes fermées entre l'IA et la base | **ajoutée le 20/08**, elle manquait au plan. Sans elle les séances n'atteignent ni l'écran de vérification ni la base |
| 5 | Une séance par créneau | à faire |
| 6 | La sauvegarde conserve « à placer » | à faire |
| 7 | Les deux garanties sur le lundi réel | à faire, **valeurs à valider par Christophe** |
| 8 | Le planning réel des Petites Poules | à faire |
| 9 | Afficher « à placer » dans le cahier journal | à faire |
| 10 | Vérifier l'import jour par jour | à faire |
| 11 | Déplacer une séance d'un jour à l'autre | à faire |
| 12 | Poser une séance « à placer » dans un créneau | à faire |

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

1. Se placer sur la branche `import-seances-un-creneau` (elle n'est pas fusionnée
   dans `main`, et `main` est intact).
2. Vérifier l'état : `npx jest` doit donner 71 suites et 697 tests verts, et
   `npx tsc --noEmit` doit être muet.
3. Traiter les cinq restes mineurs de la tâche 1 ci-dessous. Les deux premiers
   avant la tâche 3, parce que c'est elle qui fera remplir `domaine` et `libelle`
   par l'IA.
4. Enchaîner sur la tâche 2 du plan, en reprenant la même méthode : un
   implémenteur par tâche, puis une relecture de conformité à la spec, puis une
   relecture de qualité, avec boucle de correction tant qu'un relecteur a des
   réserves.

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
