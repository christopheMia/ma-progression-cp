# Le carnet de rangement : l'IA accompagne l'enseignante

Conception validée par Christophe le 18/10/2026, question par question (skill
`brainstorming`). Le fil des réponses est consigné dans
`AVANCEMENT-IMPORT-SEANCES.md`, section « CADRAGE DE L'ÉCRAN D'ACCOMPAGNEMENT
IA ».

## Le problème

Le cahier journal range chaque séance et chaque notion dans une case de
l'emploi du temps **par le nom** : des familles écrites en dur pour le
français (`src/lib/familles-seances.ts`), le domaine écrit devant les deux
points pour les notions (`src/lib/notions-creneaux.ts`). Ce qu'il ne reconnaît
pas part « à placer ».

- Chez Cécile, « Chant » et « Écoute musicale » partent à placer : sa case
  s'appelle « Musique ».
- Chez une nouvelle enseignante, rien ne correspond (son manuel, ses noms de
  cases) : presque tout partirait à placer. Le 18/10, un filet a été posé
  (option B, `estFrancaisSansJours` de `src/lib/cahier-journal.ts`) : son
  français sans jours remplit chaque case de français, sans rangement.
- L'IA d'import ne voit pas l'emploi du temps. Elle ne peut rien proposer
  case par case.

Principe de Christophe (18/10) : « l'IA doit servir à ça pour accompagner
l'utilisateur ». L'IA propose, l'enseignante valide sur un seul écran, peut
toujours passer, et n'est jamais bloquée. Si elle refuse, l'appli l'aide à
construire sa solution.

## Les décisions

| # | Décision |
|---|---|
| 1 | On construit avec elle des **règles par type** (« Vocabulaire va dans Étude de la langue »), pas une case par séance |
| 2 | Les règles valent pour **toutes les matières** |
| 3 | Elle les voit et les corrige à **trois endroits** : à l'import, dans Paramètres, depuis le cahier journal |
| 4 | Une règle peut porter un **jour préféré**, utilisé pour ce qui n'a pas de jour |
| 5 | Le carnet appartient **à chaque classe** |
| 6 | À l'import, l'IA **propose le carnet rempli, puis pose 1 à 3 questions** à choix sur le même écran |
| 7 | Les règles s'appliquent **quand le cahier journal se fabrique** (approche A) : corriger une règle suffit, pas de réimport |
| 8 | Chaque proposition se répond **Oui / Autrement / Plus tard**. « Autrement » : elle le dit **avec ses mots**, l'IA en fait une règle et la lui montre |

## Les quatre étapes

Chaque étape est livrable et testable seule, dans cet ordre.

| Étape | Contenu | IA |
|---|---|---|
| 1. Le carnet | Table des règles, lecture par le cahier journal, section « Mon rangement » dans Paramètres (voir, modifier, supprimer, ajouter avec ses mots) | Seulement pour « avec mes mots » |
| 2. Apprendre en travaillant | Après avoir posé un « à placer » dans le cahier journal : « Toujours ranger la Fluence ici ? » | Seulement pour « Autrement » |
| 3. L'IA propose le carnet à l'import | Bloc « Ton rangement » dans l'écran d'import, pour les types nouveaux | Oui, Sonnet, une fois |
| 4. Les lignes sans type | Un sommaire de manuel sans types : l'IA donne un type à chaque ligne. Retire l'option B | Oui, Haiku, un appel par document |

L'aide « avec ses mots » (un appel Haiku) est construite à l'étape 1 et resert
aux étapes 2 et 3.

## Ce que voit l'enseignante

Maquettes validées le 18/10.

**Paramètres, section « Mon rangement ».** Un tableau : ce que je range, va
dans la case, jour. Un bouton Modifier par ligne, un bouton « Ajouter une règle
avec mes mots ». Une phrase : « Ce qui n'est pas ici est rangé
automatiquement. » Les types qui vont dans la même case sont regroupés sur une
ligne à l'affichage. Une règle dont la case n'existe plus est signalée en
orange, avec « Corriger ».

**Cahier journal, après avoir posé une séance « à placer ».** Un bandeau :
« Fluence posée dans Ateliers de français, jeudi. Toujours ranger la Fluence
ici ? » avec Oui, toujours / Autrement / Juste cette fois. « Autrement » ouvre
un champ « Dis-moi où tu la fais », puis « J'ai compris : Fluence vers APC, le
vendredi. » avec C'est ça / Je réexplique.

**Import d'un document, après l'analyse.** Un bloc « Ton rangement : N types
que je ne connaissais pas » : une ligne par type avec la case proposée et
Oui / Autrement, les types sans proposition marqués « à toi de me dire », au
plus trois questions à choix, puis Valider mon rangement / Plus tard. Le bloc
n'apparaît pas s'il n'y a aucun type nouveau.

## Les données

Migration `031_regles_rangement.sql`, une table :

| Colonne | Rôle |
|---|---|
| `id` | uuid |
| `class_id` | la classe, suppression en cascade |
| `type` | le type tel qu'écrit (« Écoute musicale ») |
| `type_cle` | le type comparé : `sansAccents`, sans la marque du pluriel (la lecture `mots` de `familles-seances.ts`) |
| `creneau` | le nom de la case, tel qu'écrit dans `emploi_du_temps.matiere` |
| `jour` | `lundi` à `vendredi`, ou vide |
| `origine` | `main`, `cahier` ou `ia` |
| `created_at`, `updated_at` | dates |

Unicité sur (`class_id`, `type_cle`). Accès réservé au propriétaire de la
classe, sur le modèle de `methode_sources` (migration 016).

**Le type d'une séance** est son `domaine` s'il est rempli, sinon le texte
avant les deux points (`domaineDe` de `progression-seances.ts`). **Le type
d'une notion** est chacun de ses domaines (`domainesNotion` de
`notions-creneaux.ts`). Une ligne sans type ne relève d'aucune règle (avant
l'étape 4).

Une règle ne vise qu'une case de type `cours` visible dans le cahier journal.
Les routines cachées (« Rituel : je découvre une œuvre ») ne sont pas
proposées.

## Comment le cahier journal s'en sert

`genererCahierJournal(edt, progression, precedente, regles)`. Les règles sont
lues par `src/lib/actions/journal.ts` avec le reste. Pour chaque chose à
ranger, dans cet ordre :

1. **Une règle existe pour son type.**
   - Séance datée : la première case libre du jour qui porte le nom de la
     règle (comparaison `sansAccents`). Le jour du document l'emporte sur le
     jour préféré. Pas de case libre ce jour-là : à placer.
   - Séance sans jour : le jour préféré de la règle, sinon le premier jour de
     la semaine qui a cette case. Elle y paraît une fois.
   - Notion : la case de la règle, chaque jour où elle existe, ou seulement le
     jour préféré s'il est donné.
   - La case de la règle n'existe pas dans l'emploi du temps : à placer, et la
     règle est signalée dans « Mon rangement ».
2. **Pas de règle** : le rangement d'aujourd'hui, inchangé (familles du
   français, nom des notions, créneau partagé, option B tant que l'étape 4
   n'est pas livrée).
3. **Rien ne convient** : à placer, comme aujourd'hui.

Carnet vide = cahier journal identique à celui d'aujourd'hui. C'est la garantie
de non-régression pour Cécile. Les cahiers déjà enregistrés en base ne changent
pas tant qu'ils ne sont pas régénérés.

## Le travail de l'IA

Trois appels distincts. Chacun passe par `garderAppelIA` puis
`enregistrerUsageIA` (jauge IA). Les modèles et leurs prix sont revérifiés au
moment de coder (l'appli utilise Sonnet 5 et Haiku 4.5 ; Sonnet 5.5 et
Haiku 5.5 existent). Sur Sonnet, la réflexion est réglée volontairement : elle
est activée par défaut et mange le plafond de sortie (fiche
`cp-chantier-modeles-31juillet`).

| Appel | Modèle | Reçoit | Rend |
|---|---|---|---|
| `ia-regle` (« avec ses mots », étapes 1 à 3) | Haiku | sa phrase, les noms de ses cases par jour, le type concerné s'il est connu | une règle (type, case, jour) ou « case introuvable » avec la case la plus proche |
| `ia-rangement` (étape 3) | Sonnet | les types nouveaux du document avec 2 ou 3 exemples chacun, ses cases par jour, son carnet actuel | une case proposée par type (ou aucune), au plus 3 questions à choix et l'effet de chaque réponse |
| `ia-types` (étape 4) | Haiku | les lignes sans type d'un document, les types de son carnet et les familles connues | un type par ligne, ou aucun |

« Type nouveau » à l'étape 3 : absent du carnet ET que le rangement
d'aujourd'hui ne sait pas placer dans son emploi du temps (il partirait à
placer). Pas d'appel s'il n'y en a aucun. Un seul appel par document.

À l'étape 4, le type donné est écrit dans le champ `domaine` des séances, à
l'import, avant l'enregistrement : il n'y a rien de nouveau à stocker. L'appel
`ia-types` passe avant `ia-rangement`, pour que les types qu'il crée soient
proposés dans le même bloc. L'option B n'est retirée que lorsque les étapes 3
et 4 sont toutes deux en ligne.

L'écran d'import (`SourceImporter.tsx`) ne connaît pas l'emploi du temps
aujourd'hui : ses trois hôtes le lui passent (Paramètres et assistant le lisent
en base ; la création de classe a celui du formulaire, encore en mémoire).

## Quand ça se passe mal

| Cas | Ce que voit l'enseignante |
|---|---|
| L'IA ne répond pas, ou la jauge IA est vide | « Je n'arrive pas à proposer de rangement pour l'instant. » L'import continue, comme « Plus tard » |
| L'IA rend une case qui n'existe pas | La proposition est écartée et le type passe en « à toi de me dire » |
| « Avec ses mots » incompris deux fois | « Je n'ai pas compris, tu peux la poser à la main dans le cahier journal. » Rien n'est enregistré |
| Elle renomme une case | Règle signalée en orange dans « Mon rangement », séances à placer en attendant |

L'import n'est jamais bloqué par l'IA. Aucune règle n'est enregistrée sans un
geste de sa part (Oui, C'est ça, Valider).

## Tests

- Les tests actuels restent verts sans changement : preuve qu'un carnet vide
  ne change rien.
- Sur le vrai emploi du temps de Cécile (cases sans méthode) : « Chant vers
  Musique » range le chant le jeudi ; une règle sur une case renommée envoie à
  placer ; le jour du document l'emporte sur le jour préféré ; une séance sans
  jour va au jour préféré.
- Les trois appels IA testés avec un client simulé (format de sortie, case
  introuvable, refus de la jauge), et un essai réel par appel sur la classe de
  test avant mise en ligne, coût relevé dans la jauge.
- La politique d'accès de la table : une enseignante ne lit ni n'écrit les
  règles d'une autre classe.

## Hors périmètre

- Reprendre le carnet d'une autre classe (idée notée pour les remplaçants).
- Créer une case manquante depuis ces écrans.
- Ranger par l'assistant flottant en conversation.
- Une règle « je la place toujours moi-même ».
