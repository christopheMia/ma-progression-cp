# Une séance du document, un créneau du cahier journal (design)

Date : 2026-08-03
Auteur : Claude Code, avec Christophe
Statut : validé, prêt pour le plan d'implémentation

## Le constat de Cécile

Dans la méthode « La petite poule qui voulait voir la mer », le planning de
période porte des **puces**, et **chaque puce est une séance**. Cécile a signalé
que le cahier journal était inutilisable : *« il y avait plusieurs séances dans
le même créneau horaire »*. Dans un créneau, une maîtresse fait une chose.

Le vrai planning (`partage/exemple de planning p1.pdf`) est une grille
semaines x jours :

```
            JOUR 1                    JOUR 2                  JOUR 3                 JOUR 4
Semaine 1  . LC : La petite poule    . LC ... (séance 2)     . LC ... (séance 3)    . LC ... (séance 4)
           . Les prénoms (lettres)   . Les prénoms (nombre   . Vocabulaire (s. 1)   . Vocabulaire (s. 2)
           . Geste d'écriture          de lettres)           . Les prénoms          . Langage oral
                                                             . Geste d'écriture
```

Trois séances le jour 1, quatre le jour 3. Elles doivent tomber dans trois puis
quatre créneaux différents, pas dans un seul.

## Les trois défauts, du plus profond au plus visible

### 1. L'import jette la structure du document

`progression` (migration `006_schema_complet_idempotent.sql:210`) stocke **une
ligne par semaine** :

```sql
create table if not exists progression (
  class_id uuid, matiere text, numero int,
  items text[] not null default '{}',
  pages text, mots_exemple text[]
);
```

La journée n'a aucun endroit où exister. Le schéma de sortie de l'IA
(`src/lib/ia/schema.ts:5`) rend `{ numero, items, pages, mots_exemple }` : la
grille jours x séances est aplatie en une seule liste de chaînes.

Le jour ne survit que sous forme d'un **préfixe texte** « Jour 2 : » que le
modèle ajoute parfois, relu par `numeroJourItem`
(`src/lib/cahier-journal.ts:31`). Une convention de texte, posée de façon
inconstante, est le seul support d'une information structurelle.

### 2. Le cahier journal colle les séances entre elles

`src/lib/cahier-journal.ts:98`, dans `deroulementInitial` :

```ts
const items = retenus.join(', ')
```

Tous les items retenus pour le jour sont concaténés en une seule chaîne, **et
cette chaîne est écrite dans chaque créneau de la matière** ce jour-là. Trois
séances de français le lundi : les trois apparaissent ensemble, dans chacun des
créneaux de français. C'est exactement ce que Cécile a vu.

### 3. Le « (séance N) » du document n'est pas un rang de journée

« Vocabulaire (séance 14) » en semaine 4 : c'est le compteur propre à une
activité qui court sur toute la période, pas la quatorzième séance de la
journée. Ce nombre ne doit jamais servir à placer quoi que ce soit. Il reste
dans le libellé, parce qu'il aide l'enseignante à retrouver sa page.

## Décisions de Christophe (03/08/2026)

1. **Une puce = une séance = un créneau.**
2. **Signaler, jamais deviner.** Créneau en trop : il affiche la matière, à
   compléter. Séance en trop : elle apparaît en « à placer », cliquable. Rien
   n'est empilé, rien n'est perdu, rien n'est inventé.
3. **L'écran de vérification s'affiche à chaque import**, même quand tout semble
   juste. C'est le seul moment où quelqu'un regarde vraiment ce qui entre.
4. **Les progressions sans jours ne changent pas.** Les documents de maths,
   d'arts ou d'EMC décrivent des notions de la semaine, pas des séances : leur
   affichage actuel reste tel quel.

Ces décisions prolongent les deux règles du 31/07 : ne jamais réintroduire de
placement par devinette, et afficher la matière plutôt que du vide.

## La conception

### A. Données

Une colonne sur `progression`, pas de nouvelle table : une séance ne se lit
jamais seule, toujours dans sa semaine.

```sql
alter table progression add column if not exists seances jsonb not null default '[]'::jsonb;
```

Chaque entrée :

```ts
type SeanceProgression = {
  jour: number | null   // rang du jour d'ECOLE (1..n), null = non datée
  domaine: string       // "LC", "Vocabulaire", "Geste d'écriture", tel qu'écrit
  libelle: string       // texte exact de la puce, "(séance 3)" compris
}
```

`items text[]` reste en place et reste alimentée (un élément par séance, préfixe
« Jour N : » compris quand la séance est datée). Tout ce qui lit `items`
aujourd'hui continue de fonctionner sans être touché.

`jour` est le rang du jour **d'école**, pas du jour civil : « Jour 3 » sur une
semaine sans mercredi désigne le jeudi. C'est déjà la convention de
`genererCahierJournal` (`cahier-journal.ts:116`), on la conserve.

### B. Import

Le schéma de sortie de l'IA rend des séances :

```ts
semaines: [{ numero, pages, mots_exemple, seances: [{ jour, domaine, libelle }] }]
```

Consignes ajoutées aux prompts (`src/lib/ia/prompts.ts`, `systemImportPeriode`
en premier lieu) :

- une puce, une case élémentaire, une ligne de liste = **une séance** ;
- ne jamais fusionner deux puces, ne jamais découper une puce en deux ;
- `jour` = le rang de la colonne-jour du document (1 pour « JOUR 1 ») ;
- si le document ne montre pas de jours, `jour` vaut `null`. **Ne pas en
  inventer** ;
- `domaine` = ce qui précède les deux points dans la puce, sinon "" ;
- `libelle` = le texte exact, sans reformulation, avec son « (séance N) » ;
- une case vide ne produit aucune séance.

`fusionnerParNumero` (`schema.ts:66`) continue de rassembler les lignes d'une
même semaine : elle concatène désormais les listes de séances, sans jamais
fusionner deux séances entre elles.

**Compatibilité.** Si le modèle ne rend que `items` (ancien format, ou modèle
qui retombe dessus), chaque item devient une séance : `jour` lu depuis le
préfixe « Jour N : » s'il existe, sinon `null`. La logique de `numeroJourItem`
est réutilisée telle quelle.

### C. Écran de vérification

`SourceContentPreview.tsx` existe déjà et s'affiche avant enregistrement, avec
édition des semaines et avertissements par semaine. On l'étend, on n'en crée pas
un second :

- affichage **par jour** quand la semaine porte des séances datées : « Jour 1 :
  3 séances, Jour 2 : 2 séances… » ;
- une séance par ligne, déplaçable d'un jour à l'autre, séparable, supprimable ;
- les séances non datées d'un document qui donne des jours par ailleurs sont
  montrées à part, franchement, sous « pas de jour indiqué » ;
- le chemin normal reste **un seul bouton** pour tout accepter. L'écran informe,
  il ne barre pas la route (règle : ne jamais bloquer l'utilisatrice).

### D. Cahier journal : une séance, un créneau

Dans `genererCahierJournal`, pour chaque jour :

1. `creneauxMatiere` = les créneaux du jour rattachés à cette progression (lien
   `methode_id` d'abord, repli sur le nom de matière), triés par `ordre` ;
2. `seancesDuJour` = les séances dont `jour === indexJour + 1` ;
3. **si la progression ne porte aucune séance datée**, comportement actuel
   inchangé (décision 4) ;
4. sinon, séance `i` dans créneau `i` ;
5. créneau sans séance : il affiche le libellé de la matière (règle du 31/07) ;
6. séances au-delà du nombre de créneaux : elles partent dans `aPlacer` du jour.

Cas limites, tous traités par « signaler, jamais deviner » :

- séance portant un jour au-delà du nombre de jours d'école (« Jour 5 » sur une
  semaine de quatre jours) : elle va dans `aPlacer` du **dernier** jour, en
  gardant la mention de son jour d'origine. Aujourd'hui elle est collée au
  dernier jour sans distinction ;
- séance non datée dans un document qui date les autres : elle va dans le
  `aPlacer` du **premier** jour d'école, marquée « vaut pour la semaine ». Elle
  paraît donc une seule fois, jamais répétée sur chaque jour.

**Contrainte de forme à respecter.** `genererCahierJournal` rend un
`JourJournal[]` qui est **stocké tel quel** dans `cahier_journal.contenu`
(`src/lib/actions/journal.ts:80`) et relu par `validerContenuJournal`
(`src/lib/cahier-journal-edition.ts:56`). On ne change donc pas le type de
retour : `JourJournal` gagne un champ `aPlacer: SeancePlacer[]`, et le
validateur doit le conserver, sans quoi la première sauvegarde l'effacerait en
silence.

```ts
type SeancePlacer = {
  libelle: string
  origine: string | null   // "Jour 5" hors semaine, "semaine" si non datée, sinon null
}
```

L'affichage montre cette liste sous la journée, avec une action « choisir un
créneau ».

Cette action n'invente aucun mécanisme : elle écrit le libellé de la séance dans
le déroulement du créneau choisi via `modifierSeanceJournal`
(`src/lib/cahier-journal-edition.ts:102`), comme une saisie manuelle de
l'enseignante. La séance quitte alors la liste « à placer ».

### E. Reprise de l'existant

La migration remplit `seances` depuis `items` pour toutes les lignes déjà en
base, en relisant les préfixes « Jour N : » :

```sql
update progression p set seances = (
  select coalesce(jsonb_agg(jsonb_build_object(
    'jour',    nullif((regexp_match(item, '^\s*[Jj]ours?\s*(\d+)\s*[:.\-]'))[1], '')::int,
    'domaine', '',
    'libelle', regexp_replace(item, '^\s*[Jj]ours?\s*\d+\s*[:.\-]\s*', '')
  ) order by ord), '[]'::jsonb)
  from unnest(p.items) with ordinality as t(item, ord)
)
where jsonb_array_length(p.seances) = 0 and coalesce(array_length(p.items, 1), 0) > 0;
```

Aucun réimport n'est nécessaire : les progressions de Christophe et de Cécile
restent affichables. Un réimport du planning des Petites Poules apporte en plus
le découpage complet par jour.

### F. Tests

- `src/lib/__tests__/cahier-journal-lundi-reel.test.ts` (le lundi réel de
  Christophe, fautes de frappe comprises) gagne deux garanties :
  **aucun créneau ne porte deux séances**, et **chaque séance du jour paraît une
  fois et une seule** ;
- nouveau test sur le texte réel du planning Petites Poules : semaine 1 donne
  3 séances au jour 1 et 4 au jour 3, et le « (séance 3) » d'une puce ne devient
  jamais un numéro de jour ;
- test du surplus : 3 séances pour 2 créneaux laisse 1 séance dans `aPlacer`, et
  4 créneaux pour 3 séances laisse 1 créneau au libellé de matière ;
- test de compatibilité : une progression au format `items` seul, sans préfixe
  de jour, s'affiche exactement comme aujourd'hui.

Le test du lundi réel ne se met à jour qu'en connaissance de cause, jamais pour
faire passer une suite.

## Ce qu'on ne fait pas, et pourquoi

- **Pas de convention déclarée par méthode** (« une puce = une séance ? » posé à
  l'enseignante et mémorisé). On lui demanderait de décrire un document que
  l'application est déjà en train de lire, et une mauvaise réponse fausserait
  tout en silence.
- **Pas de placement strict pour les progressions de notions** (maths, arts,
  EMC). Elles ne décrivent pas des séances : leur imposer un créneau par ligne
  inventerait un découpage qui n'existe nulle part.
- **Pas de répartition automatique du surplus** sur un autre jour ou dans un
  créneau voisin. C'est précisément la devinette qui a produit le défaut.

## Risques connus

- **Le modèle peut fusionner deux puces malgré la consigne.** L'écran de
  vérification est là pour ça : il affiche le compte par jour, et Cécile voit
  tout de suite qu'un jour à trois puces n'en montre que deux.
- **Un document sans colonnes de jours mais avec des puces** produit des séances
  non datées : elles apparaissent en « à placer » pour la semaine. C'est honnête
  et sans perte, mais cela demande un geste à l'enseignante. À surveiller au
  premier import réel d'une autre méthode.
- **Les liens créneau vers méthode doivent tenir.** Un import d'emploi du temps
  qui repose `methode_id = null` (défaut C0a du 31/07) casserait le rattachement
  et donc tout ce placement. Le chantier C0a reste prioritaire.
