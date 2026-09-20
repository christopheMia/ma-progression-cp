# Avancement : une séance du document, un créneau du cahier journal

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

**Pas déployable pour l'instant** : le quota Vercel est saturé jusqu'en octobre.
Coder et committer ne coûte rien, déployer si.

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
