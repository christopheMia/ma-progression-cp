# Avancement : une séance du document, un créneau du cahier journal

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
| 2 | L'IA rend des séances | à faire |
| 3 | Les consignes d'import | à faire |
| 4 | La colonne en base et son remplissage | à faire |
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

## Restes mineurs de la tâche 1, approuvés mais non traités

Aucun ne bloque. Les deux premiers sont à faire AVANT la tâche 3.

1. `progression-seances.ts:82` : `String(item)` s'applique à tout ce qui n'est ni
   chaîne ni nullish. Un objet ou un tableau venu du JSONB donnerait
   `'[object Object]'` affiché tel quel dans un cahier journal, ce que la règle du
   `null` filtré cherchait justement à éviter. Restreindre la conversion aux
   `number`, `boolean`, `bigint`, et filtrer le reste.
2. Écrire quelque part, dans `types/index.ts:146` ou dans la docstring de
   `itemsDepuisSeances`, que `domaine` est **dérivé et jamais resérialisé** : une
   séance rendue par l'IA avec `domaine: 'Lecture'` et `libelle: 'La petite poule'`
   repassera par `items` et reviendra avec `domaine: ''`.
3. `progression-seances.ts:139` : quand `jour` et le préfixe du libellé désignent
   des jours différents, le champ gagne en silence. Choix défendable, mais c'est
   le seul endroit du module où du texte peut encore se perdre : à écrire dans la
   docstring.
4. La règle du jour valide existe en trois exemplaires (`jourValide`, la condition
   inline de `seancesDepuisItems`, et `numeroJourItem` dans `cahier-journal.ts`).
   Même dérive à trois branches que celle qu'on vient de fermer sur la regex.
5. Le test de l'espace insécable le place en tête d'item, donc il passe grâce au
   seul `trim()` sans jamais éprouver que `\s` couvre U+00A0. Un cas avec
   l'insécable ENTRE le mot et le numéro pinnerait vraiment la propriété dont
   dépend le contrat SQL.

## Point d'attention pour la tâche 7

La fixture du lundi réel de Christophe porte des items datés SANS colonne
`seances`. Après la migration la base en aura, donc la fixture doit en avoir
aussi, et **les attentes du français vont changer**. Ces nouvelles valeurs sont à
faire valider par Christophe, jamais à aligner en silence. Si un créneau de maths
ou d'EMC bouge, c'est une régression, pas une attente à mettre à jour.
