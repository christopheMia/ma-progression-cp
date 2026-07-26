# Calage des semaines à l'import (design)

Date : 2026-07-26
Auteur : Claude Code, avec Christophe
Statut : validé, prêt pour le plan d'implémentation

## Le problème

Quand l'enseignante importe le sommaire d'un manuel, le contenu peut ne pas
démarrer à la première semaine de la rentrée : beaucoup de manuels laissent la
semaine de rentrée à l'accueil et aux rituels, et commencent le premier son en
semaine 2.

Aujourd'hui l'application détruit cette information **deux fois**.

**Perte 1, côté serveur.** `src/lib/ia/schema.ts:47`, dans `normalizeProgression` :

```js
cleaned.sort((a, b) => a.numero - b.numero)
return cleaned.slice(0, MAX_SEMAINES).map((s, i) => ({ ...s, numero: i + 1 }))
```

Le numéro de semaine rendu par l'IA est jeté et remplacé par la position dans la
liste. Une progression qui commence en semaine 2 remonte en semaine 1, et toute
l'année est décalée d'un cran.

**Perte 2, côté client.** `src/components/methodes/SourceImporter.tsx:98`, dans
`nettoyerSemaines` :

```js
return propre.items.length || propre.pages || propre.mots_exemple.length ? [propre] : []
```

Toute semaine sans contenu est supprimée de la liste, donc une semaine 1
volontairement vide disparaît sans laisser de trace.

Chemin complet du bug : `SourceImporter.tsx:242` appelle `/api/ia-manuel`, la
route renumérote (`ia-manuel/route.ts:142`), et `SourceImporter.tsx:280` lit ce
résultat déjà abîmé.

Aggravant : l'import se déroule à l'étape 1 du setup, **avant** que la date de
rentrée soit demandée à l'étape 2. L'IA n'a donc aucun moyen de rattacher une
mention du type « semaine du 8 septembre » à l'année réelle de la classe, et
l'enseignante n'a aucun moyen de vérifier le calage puisqu'aucune date ne lui est
montrée.

Le module `src/lib/progression-sources.ts` gère correctement les numéros
(validation 1 à 36, conservation de la valeur). Il reçoit simplement une donnée
déjà fausse.

## Décisions prises

1. **La vérification se fait après l'analyse**, pas avant. L'IA montre le calage
   obtenu, semaine par semaine, avec les vraies dates. Le doute devient
   vérifiable au lieu de rester un doute.
2. **La date de rentrée passe avant l'import.** Les étapes 1 et 2 du setup sont
   inversées : « Date de la rentrée » devient l'étape 1, « Tes progressions »
   l'étape 2. L'écran existe déjà et sa valeur est pré-remplie par
   `rentreeOfficielleParDefaut(zone)`, donc le coût pour l'enseignante est d'un
   clic.
3. **La correction d'un mauvais calage se fait en un clic**, par deux boutons de
   décalage qui recalculent localement, sans appel réseau. La conversation libre
   avec l'IA reste disponible pour tout le reste.

## Architecture

Flux actuel :

```
document → IA → normalizeProgression → nettoyerSemaines → materialiserSources
                 (renumérote 1,2,3…)    (supprime les vides)
```

Flux cible :

```
étape 1 : date de rentrée + zone
              ↓
étape 2 : document → IA → calage-semaines.ts → écran de vérification → materialiserSources
                           (module pur)         (dates réelles + décalage)
```

Trois responsabilités séparées :

- `/api/ia-manuel` lit le document et rien d'autre. Il cesse de renuméroter et
  indique en plus sur quoi l'IA s'est appuyée.
- `src/lib/calage-semaines.ts` (nouveau, pur) place les semaines dans l'année.
- L'écran de vérification affiche le résultat et permet de le corriger.

### Réutilisation obligatoire de la chaîne de dates

Le module doit réutiliser exactement la chaîne employée à la création de la
classe (`src/lib/setup-creation.ts:192-210`) :

```ts
periodesOfficielles(rentreeDate, zone)
genererSqueletteSemaines(rentreeDate)
datesSemainesCalendaires(periodes, 36)
```

Sans cette réutilisation, l'écran afficherait une date et l'application en
enregistrerait une autre. Un aperçu qui ment serait pire que le bug actuel.

## Contrat du module

Fichier : `src/lib/calage-semaines.ts`. Fonction pure, aucun appel réseau, aucune
lecture d'horloge.

```ts
export type BaseCalage = 'numeros' | 'dates' | 'ordre'

export type LigneCalage = {
  numero: number          // 1 à 36
  dateLundi: string       // issu de datesSemainesCalendaires
  periodeNumero: number   // 1 à 5
  items: string[]
  pages: string
  motsExemple: string[]
  vide: boolean           // trou dans la numérotation, affiché en clair
}

export type Calage = {
  lignes: LigneCalage[]
  base: BaseCalage
  decalage: number
  avertissements: string[]
  peutAvancer: boolean
  peutReculer: boolean
}

export function calerSemaines(opts: {
  semaines: ProgressionSemaine[]  // numéros tels que rendus par l'IA
  rentreeDate: string
  zone: ZoneScolaire
  base: BaseCalage
  decalage?: number               // défaut 0
}): Calage
```

Comportement :

- applique `decalage` à chaque `numero` ;
- redonne à chaque semaine sa vraie date de lundi via la chaîne ci-dessus ;
- ré-affiche les trous de numérotation en lignes `vide: true`, jusqu'à la
  dernière semaine remplie ;
- refuse un décalage qui pousserait une semaine hors de 1 à 36 et le signale par
  `peutAvancer` / `peutReculer`, ce qui grise le bouton concerné.

Le stockage reste compact : les semaines vides ne sont pas enregistrées, le trou
dans la numérotation porte l'information. Seul l'affichage les ré-expose.

Ordre des opérations : le décalage s'applique d'abord aux numéros, l'expansion
des trous vient ensuite. Un décalage ne crée donc jamais de fausse semaine vide
en tête de liste.

Cas `base: 'ordre'` : quand le document ne porte ni numéro ni date, l'IA numérote
séquentiellement à partir de 1. C'est le comportement actuel, et c'est
exactement la situation où les boutons de décalage servent, puisque rien dans le
document ne dit où le contenu commence réellement. L'écran doit alors le dire
franchement plutôt que de laisser croire à un calage certain.

### Champ `base_calage` sur la route

`/api/ia-manuel` renvoie un champ supplémentaire indiquant sur quoi l'IA s'est
appuyée :

- `numeros` : le sommaire numérote explicitement les semaines ;
- `dates` : le document donne des dates ;
- `ordre` : rien de tel, le calage repose sur le seul ordre de la liste.

C'est ce champ qui permet à l'écran d'être honnête sur son niveau de certitude.

## Composition de l'écran

`SourceContentPreview.tsx` fait déjà 288 lignes et gère deux types de documents.
Éditer un contenu et décider où il tombe dans l'année sont deux questions
distinctes : elles restent séparées.

**1. `BandeauCalage.tsx`** (nouveau, petit)

Porte la phrase de transparence issue de `base_calage` et les deux boutons de
décalage. Un clic appelle `calerSemaines` avec `decalage ± 1` : recalcul
immédiat, aucun réseau. Les boutons sont grisés selon `peutAvancer` et
`peutReculer`.

**2. `SourceContentPreview.tsx`** (existant, une seule addition)

Reçoit une prop optionnelle `datesParNumero` et affiche la date à côté de chaque
numéro. Apprend à afficher une semaine `vide` au lieu de la faire disparaître.
Aucun autre changement.

**3. Conversation libre**

Réutilise `/api/ia-chat`. Cette route appelle elle aussi `normalizeProgression`
(`ia-chat/route.ts:72`) : la correction dans `schema.ts` protège donc les deux
chemins. Sans elle, une simple conversation de correction pourrait re-casser un
calage déjà validé.

**4. Bouton de confirmation**, inchangé, qui enchaîne sur `materialiserSources`.

## Erreurs

Règle générale : **aucune donnée n'est écartée en silence.** C'est ce qui a
produit le bug, c'est donc ce qui est interdit.

| Situation | Comportement |
|---|---|
| Décalage hors de la plage 1 à 36 | Bouton grisé et phrase explicative. Jamais un clic sans effet. |
| Calendrier officiel absent pour cette année | Numéros affichés sans les dates, avec un message clair. L'import n'est pas bloqué. |
| Aucune semaine reconnue par l'IA | Message 422 existant, inchangé. |
| Échec de la conversation de correction | Le calage courant est conservé et l'erreur affichée. Aucun état perdu. |
| Numéro hors plage, ou numéro en double | Avertissement nommé à l'écran. `progression-sources.ts` sait déjà détecter les deux cas ; l'information est simplement remontée. |

## Tests

En TDD, sur le module pur, sans jamais appeler l'IA :

1. Sommaire dont la première semaine de la rentrée est vide : S1 apparaît vide,
   S2 porte le premier son, les dates sont justes. **Ce test échoue aujourd'hui**
   et doit être écrit en premier.
2. Sommaire sans aucun numéro, calé sur le seul ordre.
3. Sommaire numéroté à partir de 2 : le trou en S1 devient visible.
4. Décalage +1 puis -1 redonne exactement l'état de départ.
5. Décalage refusé quand la dernière semaine atteint 36.
6. Les dates sautent bien les vacances.
7. Non-régression de l'aperçu : les dates affichées sont identiques à celles
   enregistrées à la création de la classe.

Ailleurs :

- `normalizeProgression` ne renumérote plus.
- Les semaines vides survivent au nettoyage de `SourceImporter`.

## Hors périmètre

Volontairement exclus de ce chantier :

- l'édition manuelle ligne par ligne du tableau (l'existant suffit) ;
- un décalage par période plutôt que global ;
- la détection automatique du fait que la première semaine « devrait » être vide.
  L'enseignante décide, l'application se contente de montrer et d'obéir.

## Fichiers touchés

| Fichier | Nature |
|---|---|
| `src/app/(app)/setup/page.tsx` | inversion des étapes 1 et 2 |
| `src/lib/ia/schema.ts` | `normalizeProgression` cesse de renuméroter |
| `src/app/api/ia-manuel/route.ts` | renvoie `base_calage`, passe la date de rentrée au prompt |
| `src/lib/ia/prompts.ts` | le prompt reçoit la date de rentrée et demande la base de calage |
| `src/lib/ia/schema-import-auto.ts` | champ `base_calage` dans la sortie structurée |
| `src/lib/calage-semaines.ts` | nouveau, module pur |
| `src/components/methodes/BandeauCalage.tsx` | nouveau, bandeau et boutons |
| `src/components/methodes/SourceImporter.tsx` | ne supprime plus les semaines vides, compose l'écran |
| `src/components/methodes/SourceContentPreview.tsx` | affiche la date et les semaines vides |
