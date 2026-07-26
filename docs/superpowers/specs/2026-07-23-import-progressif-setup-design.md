# Conception : import progressif de plusieurs sources dans le setup

**Date :** 2026-07-23  
**Statut :** conception approuvee oralement, en attente de relecture du document par l'utilisateur  
**Perimetre :** configuration initiale de la classe et ajouts ulterieurs depuis Parametres

## 1. Probleme

Le setup actuel demande une seule methode de lecture. Des qu'un document est
valide, l'application passe a la date de rentree, aux eleves, puis a l'emploi du
temps. Le professeur ne peut donc pas fournir tout ce qu'il possede avant que
l'application organise sa progression.

Dans la realite, les documents arrivent progressivement :

- un sommaire general de methode ;
- un planning detaille pour chaque periode ;
- une programmation annuelle ;
- des documents pour plusieurs matieres ;
- parfois aucun document au moment de creer la classe.

Exemple valide par l'utilisateur : le professeur importe d'abord le sommaire des
P'tites Poules, puis les plannings des periodes 1 a 5. Ces documents appartiennent
a la meme methode et doivent se completer, sans creer cinq methodes differentes.

## 2. Decisions produit validees

1. L'import des methodes est facultatif.
2. Le professeur peut creer sa classe sans methode ni progression.
3. Il peut importer autant de sources qu'il le souhaite avant de continuer.
4. Plusieurs sources de la meme methode sont regroupees dans une seule fiche.
5. Une source detaillee pour une periode est prioritaire sur un sommaire general
   lorsqu'ils se contredisent.
6. Aucun remplacement contradictoire n'est valide silencieusement : un apercu
   des changements est affiche avant confirmation.
7. Les methodes et documents pourront egalement etre ajoutes plus tard depuis
   Parametres.
8. La generation de l'emploi du temps selon les quotas officiels reste une etape
   distincte. Elle ne doit plus donner l'impression que l'import est termine.
9. Aucun nom d'eleve n'est transmis a l'IA. Seuls les contenus pedagogiques sont
   analyses.

## 3. Approches examinees

### Approche A : dossier progressif par methode, retenue

Chaque import devient une source rattachee a une methode. L'application conserve
les sources, calcule une progression fusionnee et presente les changements.

Avantages :

- correspond au travail reel des enseignants ;
- permet d'ajouter les periodes plus tard ;
- rend les priorites et les conflits explicables ;
- evite de perdre le contenu deja importe ;
- permet de recalculer la progression si une source est retiree.

### Approche B : tout importer puis fusionner une seule fois

Cette approche est plus simple techniquement, mais elle oblige le professeur a
avoir tous ses documents des le debut. Elle ne repond pas au besoin valide.

### Approche C : remplacer directement la progression existante

Cette approche ressemble au fonctionnement actuel. Elle est ecartee parce
qu'elle peut ecraser un sommaire ou une periode sans historique fiable.

## 4. Parcours utilisateur

La premiere etape du setup devient **Tes methodes et progressions**.

### Etat initial

La page explique :

> Ajoute ce que tu as deja. Un sommaire, une programmation ou un planning de
> periode. L'application les regroupera. Tu pourras aussi tout ajouter plus tard.

Deux actions sont visibles :

- **Ajouter un document**
- **Je n'ai rien a importer pour le moment**

Un bouton **J'ai ajoute tout ce que j'ai** apparait des qu'au moins une source est
validee.

### Import d'une source

1. Le professeur depose un ou plusieurs PDF formant une meme source, ou colle du
   texte.
2. L'IA propose :
   - la matiere ;
   - le nom de la methode ;
   - le type de document ;
   - la periode concernee, si elle est identifiable ;
   - le contenu structure.
3. Le professeur peut corriger ces informations avant de continuer.
4. L'application indique si la source :
   - cree une nouvelle methode ;
   - complete une methode existante ;
   - semble etre un doublon ;
   - contient des contradictions.
5. Un apercu montre les ajouts et les remplacements proposes.
6. Le professeur valide ou annule.

### Cartes de methode

Chaque methode possede une seule carte, meme si elle contient plusieurs sources.
La carte affiche :

- la matiere ;
- le nom de la methode ;
- le nombre de sources ;
- les periodes couvertes ;
- les avertissements eventuels ;
- **Ajouter un document** ;
- **Voir la progression fusionnee** ;
- **Retirer une source**.

Retirer une source recalcule l'apercu a partir des sources restantes et demande
une confirmation.

### Passage a la suite

Le professeur peut continuer de deux manieres :

- **J'ai ajoute tout ce que j'ai**, si des sources sont presentes ;
- **Je n'ai rien a importer pour le moment**, si aucune source n'est presente.

Dans les deux cas, le setup continue avec :

1. la date de rentree et la zone scolaire ;
2. les eleves, facultatifs ;
3. l'emploi du temps.

## 5. Modele de donnees

### 5.1 Brouillon du setup

Tant que la classe n'est pas creee, le navigateur conserve un brouillon :

```ts
type MethodeBrouillon = {
  cleLocale: string
  matiere: string
  nomMethode: string
  suiviActif: boolean
  sources: SourceProgressionBrouillon[]
  progressionFusionnee: ProgressionSemaine[]
}

type SourceProgressionBrouillon = {
  cleLocale: string
  nomFichier: string | null
  typeDocument: 'manuel' | 'periode' | 'programmation'
  periodeNumero: number | null
  contenuStructure: unknown
  empreinteContenu: string
  niveauPrecision: number
}
```

Le PDF ou l'image d'origine n'est pas conserve dans la base. Seuls le nom du
fichier, son empreinte et le contenu pedagogique structure sont conserves.

### 5.2 Persistance des sources

La migration `016_methode_sources.sql` ajoutera une table `methode_sources`, avec
plusieurs sources possibles pour une meme ligne de `methodes`. La source de
verite idempotente `006_schema_complet_idempotent.sql` sera mise a jour en meme
temps.

Champs principaux :

| Champ | Role |
|---|---|
| `id` | identifiant de la source |
| `methode_id` | methode concernee, suppression en cascade |
| `nom_source` | nom lisible ou nom du fichier |
| `type_document` | manuel, periode ou programmation |
| `periode_numero` | periode 1 a 5 si applicable |
| `niveau_precision` | priorite de fusion |
| `contenu_structure` | extraction pedagogique normalisee |
| `empreinte_contenu` | detection des doublons |
| `created_at` | ordre et historique |

La table aura les memes protections RLS que `methodes`, en passant par la classe
du professeur connecte.

La table `progression` reste la version hebdomadaire fusionnee utilisee partout
dans l'application. Elle n'est pas remplacee par les sources.

### 5.3 Compatibilite avec la classe sans methode

La creation des 36 semaines devient independante de `genererProgression()`.
L'application cree d'abord un squelette calendaire vide avec :

- les numeros de semaine ;
- les vraies dates de classe ;
- les numeros de periode ;
- la progression Explorer le monde deja prevue ;
- aucun contenu de methode si rien n'a ete importe.

`classes.manuel_id` est un champ historique. Une valeur interne neutre sera
utilisee pour respecter le schema existant, mais elle ne sera plus affichee comme
la methode de la classe. Les pages Planning et Parametres afficheront les vraies
methodes depuis la table `methodes`, ou **Aucune methode pour le moment**.

## 6. Extraction et regroupement

La route d'import renvoie des informations plus completes qu'aujourd'hui :

```ts
{
  matiere: string
  nom_methode: string
  type_document: 'manuel' | 'periode' | 'programmation'
  periode_numero: number | null
  progression: ProgressionSemaine[]
  periodes: PeriodeProgrammation[]
  confiance_detection: number
  avertissements: string[]
}
```

Le professeur garde toujours le dernier mot. Une detection peu sure doit etre
signalee et corrigeable.

Le regroupement automatique s'appuie sur la matiere et un nom de methode
normalise. Si le rapprochement est incertain, l'application demande de choisir
entre :

- completer une methode existante ;
- creer une nouvelle methode.

Pour la premiere version, une classe conserve une methode principale par
matiere, conformement au schema actuel. Plusieurs documents peuvent alimenter
cette methode.

## 7. Regles de fusion

La fusion suit des regles stables et testables :

1. un planning de periode detaille est prioritaire sur une programmation
   annuelle ;
2. une programmation annuelle est prioritaire sur un simple sommaire general ;
3. une source ne modifie que les semaines ou periodes qu'elle couvre ;
4. le contenu des autres periodes est conserve ;
5. les doublons exacts ou normalises sont regroupes ;
6. a niveau de precision egal, le contenu existant est conserve par defaut et la
   contradiction est montree dans l'apercu ;
7. aucun contenu non concerne n'est supprime ;
8. toute fusion produit un resume : ajouts, remplacements, doublons et conflits.

L'IA sert a extraire et a rapprocher les formulations pedagogiques. La decision
de priorite reste appliquee par le code, afin qu'elle soit previsible.

Une programmation par periode est repartie sur les vraies semaines de classe
seulement apres le choix de la date de rentree et de la zone scolaire.

## 8. Enregistrement final

La creation finale reste protegee :

1. conserver l'ancienne classe tant que la nouvelle n'est pas complete ;
2. creer la nouvelle classe ;
3. creer les cinq periodes officielles ;
4. creer les 36 semaines calendaires, meme sans methode ;
5. creer une ligne `methodes` par matiere importee ;
6. enregistrer toutes les `methode_sources` ;
7. enregistrer la progression fusionnee dans `progression` ;
8. creer l'emploi du temps ;
9. supprimer l'ancienne classe uniquement apres reussite complete.

En cas d'erreur, la nouvelle classe incomplete est supprimee et l'ancienne reste
utilisable.

## 9. Ajouts ulterieurs depuis Parametres

Le meme composant d'import et les memes regles de fusion seront reutilises dans
**Parametres > Mes methodes**.

Le professeur pourra :

- ajouter sa premiere methode a une classe creee sans methode ;
- ajouter un planning de periode a une methode existante ;
- consulter les sources deja prises en compte ;
- corriger la matiere, la methode ou la periode detectee ;
- retirer une source et verifier la nouvelle fusion avant validation.

Le setup et Parametres ne doivent pas avoir deux comportements differents.

## 10. Gestion des erreurs

- Un import echoue ne touche pas aux sources deja validees.
- Un doublon probable est bloque jusqu'a confirmation.
- Une detection incertaine est affichee clairement.
- Une contradiction ne remplace rien sans validation.
- Une erreur pendant la creation finale restaure l'etat precedent.
- Le bouton de validation est desactive pendant l'enregistrement pour eviter les
  doubles creations.
- Les messages parlent en termes simples : document, methode, periode et
  progression.

## 11. Tests obligatoires

### Tests unitaires

- regroupement de deux documents de la meme methode ;
- separation de deux matieres ;
- priorite periode > programmation > sommaire ;
- conservation des periodes non concernees ;
- detection de doublons ;
- fusion a niveau de precision egal ;
- generation d'un squelette vide de 36 semaines ;
- repartition d'une programmation selon les vraies periodes scolaires.

### Tests d'actions serveur

- creation d'une classe sans methode ;
- creation avec plusieurs matieres et plusieurs sources ;
- enregistrement des sources et de la progression fusionnee ;
- ajout ulterieur a une methode existante ;
- retour arriere complet si une insertion echoue.

### Tests d'interface

- bouton de passage sans import ;
- ajout successif de plusieurs documents ;
- correction des detections IA ;
- apercu des conflits ;
- retour a une etape precedente sans perte du brouillon ;
- usage mobile ;
- navigation clavier et libelles accessibles.

### Verification finale

- suite Jest complete ;
- build Next.js ;
- verification manuelle du parcours sans methode ;
- verification manuelle avec le sommaire P'tites Poules puis un planning de
  periode ;
- verification de l'ajout ulterieur depuis Parametres.

## 12. Criteres de reussite

La fonctionnalite est terminee lorsque :

1. un professeur peut creer sa classe sans posseder de methode ;
2. il peut importer plusieurs documents avant de finir le setup ;
3. plusieurs documents de la meme methode restent groupes ;
4. un planning de periode complete le sommaire sans effacer le reste ;
5. les changements sont visibles avant validation ;
6. plusieurs matieres peuvent etre configurees ;
7. le meme parcours reste disponible apres la creation de la classe ;
8. les donnees existantes sont preservees ;
9. les tests et le build sont valides.

## 13. Hors perimetre de cette livraison

- plusieurs methodes concurrentes dans une meme matiere ;
- stockage des PDF originaux ;
- analyse automatique de tous les documents d'un dossier local ;
- generation autonome de contenus manquants sans validation du professeur ;
- modification de l'emploi du temps a partir des documents importes.
