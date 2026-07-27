# Spec : les trois vues du suivi des élèves

Rédigée le 2026-07-27 par Claude, à partir du retour de Christophe le jour même.
**Pas encore validée, pas encore commencée.** Une question de fond reste ouverte
(section « La décision qui manque »), et elle change le code.

## Le problème

Le suivi des élèves est organisé **par notion**. Pour chaque notion, la page
déroule les 23 élèves de la classe. Cette organisation ne répond bien à aucune
des deux questions qu'un enseignant se pose réellement :

- « Où en est ma classe sur cette notion ? » Il faut parcourir 23 blocs pour se
  faire une idée d'ensemble.
- « Où en est Lina ? » Ses informations sont éparpillées dans toutes les notions
  de la semaine.

Mots de Christophe : « peut-être qu'on devrait pouvoir ouvrir une page par élève
en cliquant ou développer, et faire également une vue simplifiée complète ».

## Le principe retenu

Trois niveaux de lecture, du général au particulier. Les deux idées de Christophe
ne se concurrencent pas : elles répondent chacune à une des deux questions.

1. **Vue d'ensemble de la classe (nouvelle, deviendrait la vue par défaut).**
   Un tableau : les élèves en lignes, les notions en colonnes, une pastille par
   case. En un écran, on voit qui décroche et sur quoi.
2. **Fiche d'un élève (nouvelle).** On clique la ligne d'un élève, on obtient
   tout ce qui le concerne : ses notions, ses critères, son bilan, son
   commentaire. C'est la vue utile pour une rencontre avec les parents ou pour
   remplir le LSU.
3. **Détail par notion (l'écran actuel).** Il descend au troisième niveau : c'est
   là qu'on coche, notion par notion.

## Ce qui rend ce chantier peu risqué

Les données sont **déjà** enregistrées par élève et par critère, dans
`acquisitions` (suivi historique de la notion) et `acquisitions_criteres`
(critères personnalisés, migration 018). Les trois vues ne sont que des lectures
différentes du même contenu.

**Aucune migration, aucune modification de schéma, aucune écriture nouvelle.**
C'est un argument qui compte : local et production partagent la même base, celle
que Cécile utilise.

Conséquence pratique : la logique d'agrégation doit être une **fonction pure**
testable (dans l'esprit de `src/lib/vue-periode.ts` et `src/lib/calage-semaines.ts`),
pas du calcul dispersé dans le JSX.

## La décision qui manque

**Que résume une pastille quand une notion porte plusieurs critères ?**

Exemple concret : la notion « Lire a » a 4 critères, Lina en a 2 acquis.

- Option A, trois niveaux de couleur : rien commencé / en cours / acquis.
  Lecture immédiate, mais « en cours » écrase la différence entre 1 sur 4 et
  3 sur 4.
- Option B, une fraction (2/4). Précis, mais 23 lignes de fractions se lisent
  moins vite qu'un damier de couleurs.
- Option C, une couleur dégradée selon la proportion. Joli, mais un enseignant
  ne lit pas une nuance de violet comme une valeur.

Ce choix change le code et surtout ce qu'on lit d'un coup d'oeil. **À trancher
avec Christophe avant d'écrire la moindre ligne.**

Autre point à cadrer avec lui : le suivi historique de la notion dans son
ensemble (`acquisitions`) et les critères personnalisés
(`acquisitions_criteres`) sont deux informations distinctes. La pastille résume
laquelle des deux, ou les deux ?

## Contraintes à respecter

- **Convention 3** : ne pas modifier l'UI du produit phare sans l'accord
  explicite de Christophe. Cette spec se fait valider avant d'être codée.
- **Téléphone et tablette** : un tableau de 23 lignes sur N colonnes ne doit pas
  imposer de défilement horizontal. La grille EDT a déjà résolu ce problème
  (`table-fixed`, libellés abrégés sous 34rem), s'en inspirer.
- **Notions longues** : les intitulés de manuel dépassent souvent 80 caractères.
  En en-tête de colonne, ils devront être abrégés avec accès au titre complet.
  Attention au piège déjà rencontré : ne pas multiplier les attributs `title`,
  le test des notions longues utilise `getByTitle` et échoue s'il en trouve deux.
- **Jamais bloquer l'utilisateur** (règle d'or du produit) : tout doit rester
  cliquable et réversible.
- **RGPD** : aucun prénom d'élève ne part vers l'IA. Ces vues sont purement
  locales, aucun appel IA n'est nécessaire.

## Ordre de travail proposé

1. Trancher la question de la pastille avec Christophe.
2. Écrire la fonction pure d'agrégation et ses tests, avant toute UI.
3. La vue d'ensemble de la classe, en lecture seule.
4. La fiche d'un élève, en repliage sur place plutôt qu'une vraie page : pas
   d'aller-retour serveur, donc plus rapide sur la tablette.
5. Rebrancher la navigation : ensemble, puis élève, puis notion.
