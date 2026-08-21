import type { SeanceProgression } from '@/types'

/**
 * Marqueur de jour en tête d'un item : « Jour 2 : Grammaire ».
 *
 * Depuis que `cahier-journal.ts` importe cette regex au lieu de la
 * redéfinir, c'est le SEUL endroit du dépôt qui connaît cette convention.
 * Elle date de l'époque où la table n'avait pas de colonne pour la journée :
 * le jour ne survivait que dans le texte.
 *
 * Grammaire exacte, à reproduire à l'identique côté SQL le jour où une
 * migration remplira une colonne "seances" en base directement (ce
 * commentaire sert de contrat pour cette migration future) :
 *
 * - insensible à la casse ("Jour", "JOUR", "jour" acceptés) ;
 * - "jour" ou "jours", le "s" final est optionnel ;
 * - un ou plusieurs chiffres pour le numéro (deux chiffres acceptés,
 *   "Jour 12" par exemple) ;
 * - cinq séparateurs acceptés juste après le numéro : `:` `.` `-` (tiret
 *   simple), `–` (tiret demi-cadratin, U+2013) et le tiret cadratin U+2014
 *   (non reproduit ici tel quel, en dehors de la classe de caractères du
 *   regex, par cohérence avec la règle du dépôt) ;
 * - des espaces libres avant "jour", autour du numéro et après le
 *   séparateur.
 *
 * Piège pour une implémentation SQL : `\s` en JavaScript couvre l'espace
 * insécable U+00A0 (et d'autres espaces Unicode), alors que la classe POSIX
 * `[[:space:]]` de Postgres ne couvre en général PAS U+00A0. Un document
 * collé depuis Word qui commence une puce par un espace insécable serait
 * donc reconnu ici mais pas par un `regexp_replace` naïf côté base : il
 * faudra y ajouter U+00A0 explicitement dans la classe de caractères
 * d'espace pour que la colonne remplie en SQL ne diverge jamais de ce calcul
 * applicatif.
 *
 * Ne jamais appliquer cette regex directement : passer par `lirePrefixeJour`,
 * qui refuse en plus les intervalles et les numéros invalides. Une lecture
 * brute (`item.match(PREFIXE_JOUR)`, `libelle.replace(PREFIXE_JOUR, '')`)
 * découpe « Jours 3-4 : révisions » en jour 3 + « 4 : révisions », c'est
 * exactement la régression du 20/08.
 */
export const PREFIXE_JOUR = /^\s*jours?\s*(\d+)\s*[:.\-–—]\s*/i

/**
 * Intervalle de jours en tête d'un item : « Jours 3-4 », « Jour 3 - 4 »,
 * « Jours 3 et 4 », « Jours 3 à 4 », « Jours 3, 4 », « Jours 3.4 ».
 *
 * RÈGLE (20/08/2026) : un intervalle N'EST PAS un rang de jour. La séance sort
 * avec `jour: null` et son libellé INTACT, préfixe compris.
 *
 * Pourquoi une regex de plus. Le tiret d'un intervalle est le MÊME caractère
 * que l'un des séparateurs acceptés par `PREFIXE_JOUR` : « Jours 3-4 :
 * révisions » y était lu comme « Jour 3 » suivi du libellé « 4 : révisions ».
 * Tant que `items` était rendu tel quel, la casse ne se voyait que dans le
 * champ `domaine`. Depuis que `items` est réécrit depuis les séances, la puce
 * de l'enseignante ressortait affichée et enregistrée en
 * « Jour 3 : 4 : révisions ». Du texte déformé, pas seulement dégradé.
 *
 * C'est « signaler, jamais deviner » appliqué au texte : l'application ne
 * choisit pas entre le jour 3 et le jour 4, elle laisse la puce telle quelle
 * et l'enseignante voit ce que dit son document.
 *
 * Les liaisons acceptées sont les QUATRE séparateurs de `PREFIXE_JOUR` sauf
 * les deux points, plus la virgule, l'esperluette, la barre oblique et les mots
 * « et », « à », « a », « ou », « puis ». Le point en fait partie depuis le
 * 21/08 : « Jours 3.4 : révisions » et « Jour 3. 4 : révisions » sortaient
 * encore en « Jour 3 : 4 : révisions ». L'esperluette, la barre oblique,
 * « ou », « puis » et les liaisons COLLÉES aux chiffres (« Jours 3et4 ») ont
 * suivi le même chemin : chacune faisait poser le jour du modèle et un préfixe
 * devant le texte entier. Les mots n'exigent donc plus d'espace autour d'eux,
 * ce qui ne déborde pas : la liaison doit suivre immédiatement les chiffres du
 * premier jour et être immédiatement suivie de ceux du second, si bien que
 * « Jour 3 : 4 opérations » ou « Jour 3 avril » n'en sont pas.
 * Les deux points sont volontairement exclus, sinon « Jour 3 : 4 opérations »
 * cesserait d'être daté au jour 3, ce qui est le cas le plus courant des deux.
 *
 * Le `domaine`, lui, reste calculé sur le libellé intact, donc « Jours 3-4 ».
 * Bancal, mais du même ordre que « Jour 0 : Rentrée » qui rend déjà le domaine
 * « Jour 0 » : un domaine imparfait n'a jamais fait perdre de texte, et cette
 * régularité est ce qui garde la conversion idempotente.
 *
 * Ambiguïté assumée : « Jour 3 - 4 opérations » est lu comme un intervalle,
 * donc laissé intact et non daté, alors que l'enseignante voulait peut-être le
 * jour 3. Perdre une datation incertaine coûte moins cher que déformer une
 * puce. Les tirets sont écrits par leur code point (U+2013, U+2014) pour ne
 * pas faire figurer un tiret cadratin en toutes lettres dans le dépôt.
 *
 * LIMITE REFERMÉE LE 21/08. `cahier-journal.ts` lisait encore `items` avec
 * `PREFIXE_JOUR` seul (`numeroJourItem`, `itemsDuJour`) : un item d'intervalle
 * y était daté au premier des deux jours et affiché amputé de son début
 * (« Jours 3-4 : révisions » devenait « 4 : révisions »). L'import ne
 * fabriquait plus d'item déformé, mais l'affichage en déformait encore un venu
 * d'une ligne enregistrée avant la correction. Ce module-là passe maintenant
 * par `lirePrefixeJour`, comme tout le monde ; attendre la tâche 5 du plan
 * (« Une séance par créneau ») aurait laissé le défaut visible à l'écran entre
 * temps.
 */
const LIAISONS_INTERVALLE = `[-.,&/${String.fromCharCode(0x2013, 0x2014)}]`
const MOTS_INTERVALLE = 'puis|ou|et|à|a'
const INTERVALLE_JOURS = new RegExp(
  `^\\s*jours?\\s*\\d+\\s*(?:${LIAISONS_INTERVALLE}|${MOTS_INTERVALLE})\\s*\\d+`,
  'i',
)

/**
 * Domaine = ce qui précède les deux points, quand c'est court.
 *
 * « LC : La petite poule » donne "LC". Une phrase entière suivie de deux
 * points n'est pas un domaine : au-delà de `MAX_LONGUEUR_DOMAINE` caractères
 * on renonce plutôt que de couper une phrase au hasard.
 *
 * Deux limites connues, non corrigées ici : le SQL n'a pas à les reproduire,
 * elles dégradent seulement la qualité du champ "domaine", jamais la perte
 * de texte (le libellé, lui, reste intact).
 *
 * - Toute ponctuation à deux points assez tôt dans le texte est prise pour
 *   un domaine : "8:30 accueil" donne le domaine "8".
 * - Un préfixe de jour non retenu reste dans le libellé, donc devient le
 *   domaine : "Jour 0 : Rentrée" donne "Jour 0", et "Jours 3-4 : révisions"
 *   donne "Jours 3-4" (voir INTERVALLE_JOURS). Le libellé, lui, reste entier.
 */
const MAX_LONGUEUR_DOMAINE = 30

function domaineDe(libelle: string): string {
  const coupe = libelle.indexOf(':')
  if (coupe < 1 || coupe > MAX_LONGUEUR_DOMAINE) return ''
  return libelle.slice(0, coupe).trim()
}

/**
 * Numéro de jour valide au sens de la convention : un entier strictement
 * positif, pas seulement une valeur "vraie" (donc ni `0`, ni `NaN`, ni
 * négatif, ni décimal). Seule définition du dépôt : `jourValide`,
 * `seancesDepuisItems` et `numeroJourItem` (`cahier-journal.ts`) s'en
 * servaient chacun à sa façon avant, la même dérive à trois branches que
 * celle déjà fermée sur la regex `PREFIXE_JOUR`.
 *
 * Plus AUCUN module ne l'importe depuis le 21/08 : `cahier-journal.ts`, son
 * dernier lecteur, passe désormais par `lirePrefixeJour`, qui l'applique pour
 * lui. L'export reste comme définition de référence de la convention, à
 * reproduire à l'identique le jour où une migration SQL datera les séances en
 * base ; ce n'est pas un point d'extension à rebrancher ailleurs.
 */
export function estJourValide(n: number): boolean {
  return Number.isInteger(n) && n > 0
}

/** Jour valide au sens de la convention : un entier strictement positif, pas seulement une valeur "vraie". */
function jourValide(jour: number | null): jour is number {
  return jour !== null && estJourValide(jour)
}

/** Ce que le TEXTE d'une puce dit de sa journée. */
type LecturePrefixeJour = {
  /** Le rang de jour écrit en tête, `null` si le texte n'en désigne pas un seul. */
  jour: number | null
  /** Le texte sans son préfixe, ou le texte entier quand rien n'a été retiré. */
  libelle: string
  /**
   * Vrai quand le texte PARLE de jours sans en désigner un seul : un intervalle
   * (« Jours 3-4 »), ou un numéro refusé (« Jour 0 »). Dans ce cas le texte a
   * quand même son mot à dire : il interdit de dater la puce autrement, sinon
   * on choisirait à la place de l'enseignante.
   */
  ambigu: boolean
}

/**
 * LA lecture du préfixe de jour. Point de passage unique : personne d'autre
 * dans ce module n'applique `PREFIXE_JOUR` directement, parce que la regex
 * seule ne sait pas refuser un intervalle ni un « Jour 0 », et qu'un chemin
 * qui l'oublie déforme le texte de l'enseignante (régression du 20/08,
 * rouverte par `itemsDepuisSeances` et refermée le 21/08).
 *
 * Le préfixe n'est retiré du libellé QUE si son numéro est retenu comme jour
 * valide : les deux décisions sont prises ensemble. Sinon "Jour 0 : Rentrée"
 * perdrait le texte de l'enseignante en route (jour rejeté, mais préfixe
 * quand même effacé), ce qui casserait l'aller-retour avec
 * `itemsDepuisSeances` que la future migration SQL doit pouvoir reproduire à
 * l'identique.
 *
 * Exportée depuis le 21/08 pour `cahier-journal.ts`, qui appliquait encore
 * `PREFIXE_JOUR` brute et déformait donc les intervalles à l'affichage.
 */
export function lirePrefixeJour(texte: string): LecturePrefixeJour {
  const brut = texte.trim()
  // Un intervalle de jours n'est pas un rang de jour : on ne lit aucun préfixe.
  if (INTERVALLE_JOURS.test(brut)) return { jour: null, libelle: brut, ambigu: true }
  const trouve = brut.match(PREFIXE_JOUR)
  if (!trouve) return { jour: null, libelle: brut, ambigu: false }
  const numero = Number(trouve[1])
  if (!estJourValide(numero)) return { jour: null, libelle: brut, ambigu: true }
  return { jour: numero, libelle: brut.slice(trouve[0].length).trim(), ambigu: false }
}

/**
 * Convertit un élément potentiellement non-string en texte, sans jamais
 * supprimer du contenu écrit par l'enseignante. `items` peut venir tel quel
 * d'une colonne JSONB Supabase, où un nombre, un booléen, un `null` isolé,
 * ou même un objet ou un tableau mal formé, sont possibles.
 *
 * Le critère est le sens, pas la littéralité : un nombre, un booléen ou un
 * `bigint` EST du contenu, il devient sa représentation texte ("42",
 * "true"). Un `null`, un `undefined`, ou un objet/tableau ne sont PAS du
 * texte écrit par l'enseignante : ils deviennent "" pour être filtrés comme
 * une entrée vide, plutôt que de s'afficher tels quels ("null",
 * "[object Object]") dans un cahier journal.
 */
function aTexte(item: unknown): string {
  if (typeof item === 'string') return item
  if (typeof item === 'number' || typeof item === 'boolean' || typeof item === 'bigint') {
    return String(item)
  }
  return ''
}

/**
 * Relit les items bruts d'une ligne de progression pour en faire des
 * séances.
 *
 * L'ordre des séances rendues suit l'ordre des items non vides, MAIS PAS
 * leur index d'origine : les entrées vides sont filtrées, donc `seances[i]`
 * ne correspond plus forcément à `items[i]`. Les positions RELATIVES, elles,
 * sont conservées, et `completerSeances` s'en sert pour ranger chaque item à
 * son rang de lecture.
 *
 * `items` est typé `unknown[]` plutôt que `string[]` pour que le garde-fou
 * contre un élément non-string soit réellement atteignable et testable, pas
 * du code mort masqué par le typage. `items` absent ou `null` rend un
 * tableau vide plutôt que de jeter.
 */
export function seancesDepuisItems(items: unknown[] | null | undefined): SeanceProgression[] {
  return (items ?? []).flatMap(item => {
    const seance = seanceDepuisTexte(aTexte(item))
    return seance ? [seance] : []
  })
}

/**
 * Fabrique UNE séance à partir du texte d'une puce, plus ce que le modèle a
 * éventuellement rendu à côté du texte.
 *
 * Point de passage unique : `seancesDepuisItems` (le repli sur l'ancien
 * format) et le nettoyage de la sortie IA (`src/lib/ia/schema.ts`) appellent
 * tous les deux cette fonction. Sans cela, le chemin « nouveau format »
 * gardait `jour: null` sur un libellé « Jour 3 : Fluence » là où le repli
 * trouvait le jour 3, et laissait le préfixe dans le libellé alors que le
 * contrat du type (`src/types/index.ts`) promet l'inverse : deux champs du
 * même objet se contredisaient.
 *
 * Qui gagne, quand les deux sources parlent :
 *
 * - `jour` : LE TEXTE DE LA PUCE D'ABORD. S'il porte un préfixe « Jour N : »
 *   valide, c'est ce N qui date la séance ; s'il parle de jours sans en
 *   désigner un seul (« Jours 3-4 », « Jour 0 »), la séance sort NON DATÉE.
 *   Le `jour` du modèle ne sert que quand le texte ne dit rien de la journée,
 *   ce qui reste le cas courant (il a lu une colonne du tableau que le texte
 *   de la puce ne porte pas). Jamais de jour deviné.
 * - `domaine` : celui du modèle s'il en donne un (il a pu le lire dans un
 *   en-tête de colonne absent du libellé), sinon il est dérivé du libellé. Et
 *   s'il en donne un que le texte de la puce ne porte pas, ce domaine est
 *   RÉÉCRIT DEVANT le libellé (voir `avecDomaine`) : c'est ce qui le fait
 *   arriver jusqu'à l'écran.
 *
 * POURQUOI LE TEXTE GAGNE (21/08/2026, correction du point 6 de la relecture).
 * Avant, `jour` du modèle écrasait le préfixe en silence : une séance
 * `{ jour: 2, libelle: 'Jour 5 : Fluence' }` ressortait en « Jour 2 : Fluence »
 * et le 5 écrit dans le document disparaissait sans un mot. C'était le dernier
 * endroit du module où du texte était DEVINÉ au lieu d'être SIGNALÉ, contre la
 * règle d'or de la spec. Entre les deux options ouvertes (garder le jour du
 * document, ou poser un avertissement sur la semaine), on garde le jour du
 * document : c'est le seul des deux qui se voit vraiment, puisque `items` est
 * réécrit avec ce préfixe et que le cahier journal n'affiche que `items`. Un
 * avertissement aurait demandé de faire remonter un canal d'alerte depuis une
 * fonction pure jusqu'à la route d'import, pour un cas où la bonne valeur est
 * déjà écrite noir sur blanc dans la puce.
 *
 * Rend `null` quand il ne reste aucun texte : une case vide du tableau n'est
 * pas une séance, et une puce réduite à son seul préfixe (« Jour 4 : », une
 * case vide dont le modèle recopie l'en-tête) non plus. Sans ce second cas,
 * la chaîne rendait `items: ['Jour 4 : ']`, puis le cahier journal affichait
 * un créneau VIDE au lieu du nom de sa matière : `itemsDuJour` rendait `['']`,
 * donc `retenus.length` valait 1 et le repli sur `creneau.matiere` n'était pas
 * pris (`src/lib/cahier-journal.ts`).
 */
export function seanceDepuisTexte(
  texte: string,
  jourModele: number | null = null,
  domaineModele = '',
): SeanceProgression | null {
  const lu = lirePrefixeJour(texte)
  if (!lu.libelle) return null
  // Le jour du modèle ne sert QUE si le texte ne dit rien de la journée : ni
  // rang lisible, ni mention ambiguë qui interdirait de trancher.
  const jour = lu.jour === null && !lu.ambigu && jourValide(jourModele) ? jourModele : lu.jour
  const domaine = domaineModele.trim()
  const libelle = avecDomaine(lu.libelle, domaine)
  return {
    jour,
    domaine: domaine || domaineDe(libelle),
    libelle,
  }
}

/**
 * Le texte d'une puce, son domaine devant.
 *
 * LA DÉCISION DE CHRISTOPHE (21/08/2026), qui commande tout ce qui suit : le
 * domaine reste VISIBLE dans le cahier journal. On garde « LC : La petite poule
 * (séance 1) », pas « La petite poule (séance 1) ».
 *
 * Sa raison, décisive : dans son planning réel
 * (`partage/exemple de planning p1.pdf`), deux séances portent le même texte de
 * Rimbaud, l'une en langage oral, l'autre en production d'écrits. Sans le
 * préfixe de domaine, les deux lignes sont identiques à l'écran et l'enseignante
 * ne sait plus laquelle est laquelle. « LC » = lecture compréhension, « PDE » =
 * production d'écrits, ce sont les abréviations du manuel.
 *
 * POURQUOI ICI, ET PAS DANS LE PROMPT. La consigne inverse existait : le prompt
 * demandait au modèle de ne PAS recopier le domaine devant le texte, pour éviter
 * les doublons. Elle est retirée, et la protection contre le doublon vient
 * maintenant du code (`memePuceAuDomainePres`, comparaison tolérante). C'est le
 * principe qui a débloqué ce chantier : le code ne doit jamais exiger de l'IA
 * une perfection au caractère près. Et une consigne suivie à la lettre faisait
 * DISPARAÎTRE du texte : sur « Vocabulaire (séance 3) », dont le domaine n'est
 * pas séparé par des deux points, l'écran affichait « (séance 3) ».
 *
 * POURQUOI DANS LE LIBELLÉ, ET PAS SEULEMENT DANS `items`. Le champ `domaine`
 * ne survit pas à un aller-retour par le texte : le cahier journal ne lit que
 * `items`, et `ia-chat` renvoie des semaines sans leur champ `seances`. Écrire
 * le domaine dans le libellé, c'est le mettre là où il se relit tout seul. La
 * conversion reste donc idempotente dès le premier passage, au lieu de converger
 * seulement au second.
 *
 * Le domaine n'est PAS réécrit dans trois cas, chacun pour ne rien abîmer :
 *
 * - la puce annonce déjà un domaine dans son texte (`domaineDe` en trouve un) :
 *   en empiler un second devant serait du bruit, et le texte du document dit
 *   déjà ce qu'il a à dire ;
 * - le texte COMMENCE par le domaine sans deux points (« Vocabulaire (séance 3) »
 *   pour un domaine « Vocabulaire ») : la comparaison est faite sur la forme
 *   normalisée, et sur un mot entier, pour qu'un domaine « Le » ne se croie pas
 *   déjà présent dans « Lecture offerte » ;
 * - le domaine est trop long pour être relu comme tel (au-delà de
 *   `MAX_LONGUEUR_DOMAINE`), ou contient lui-même des deux points. Le réécrire
 *   fabriquerait un texte que `domaineDe` ne redécouperait pas pareil, donc une
 *   puce que `memePuceAuDomainePres` cesserait de reconnaître : elle
 *   ressortirait EN DOUBLE. Un domaine trop long reste alors dans son champ, et
 *   n'atteint pas l'écran ; c'est la limite connue, bornée, de cette réécriture.
 */
function avecDomaine(libelle: string, domaine: string): string {
  if (!domaine) return libelle
  if (domaine.length > MAX_LONGUEUR_DOMAINE || domaine.includes(':')) return libelle
  if (domaineDe(libelle)) return libelle
  if (commencePar(libelle, domaine)) return libelle
  return `${domaine} : ${libelle}`
}

/**
 * Le texte commence-t-il par ce domaine, au mot entier près ?
 *
 * La comparaison se fait sur la forme normalisée (casse, accents, apostrophes,
 * espaces), et la suite doit être autre chose qu'une lettre ou un chiffre :
 * sans cette dernière condition, un domaine « Le » se croirait déjà écrit dans
 * « Lecture offerte ». `normaliserTexte` ayant retiré accents et ligatures et
 * tout mis en minuscules, `[a-z0-9]` suffit à décrire « une lettre ou un
 * chiffre » ici.
 */
function commencePar(libelle: string, domaine: string): boolean {
  const tete = normaliserTexte(domaine)
  if (!tete) return true
  const texte = normaliserTexte(libelle)
  if (!texte.startsWith(tete)) return false
  const suite = texte.slice(tete.length)
  return suite === '' || !/[a-z0-9]/.test(suite[0])
}

/**
 * Texte ramené à sa forme comparable. C'est ici, et nulle part ailleurs, que
 * se place la FRONTIÈRE DE TOLÉRANCE entre « deux écritures de la même puce »
 * et « deux puces différentes ».
 *
 * Ce qui est toléré, parce que ce sont des différences de FORME que deux
 * lectures du même document produisent couramment :
 *
 * - la casse (« ECRITURE » et « Écriture ») ;
 * - les accents (« Ecriture » et « Écriture ») : décomposition NFD puis
 *   retrait des diacritiques ;
 * - les espaces, y compris l'insécable d'un copier-coller Word ;
 * - la ponctuation FINALE (« Découverte du son [a]. » et « … [a] ») ;
 * - les VARIANTES TYPOGRAPHIQUES d'un même signe (voir `EQUIVALENCES_TYPO`) :
 *   apostrophe droite et apostrophe courbe, ligatures, points de suspension,
 *   guillemets, tirets. Ajoutées le 21/08 : le document de référence écrit
 *   « Geste d’écriture » avec l'apostrophe courbe SIX fois pendant que le
 *   prompt mélange les deux formes, et chaque occurrence produisait un doublon.
 *   Ce sont bien des différences de FORME : les deux écritures se lisent
 *   pareil à voix haute et désignent la même puce.
 *
 * S'y ajoute UNE tolérance de structure, qui ne passe pas par cette fonction
 * mais par `memePuceAuDomainePres` : le domaine écrit devant le texte d'un
 * côté et rangé dans le champ `domaine` de l'autre.
 *
 * Ce qui n'est PAS toléré, et ne doit jamais l'être : toute différence de
 * CONTENU. Pas de ponctuation interne effacée, pas de mots vides ignorés, pas
 * de distance d'édition, pas de troncature, pas de comparaison par préfixe.
 * « Le son [a] » et « Le son [o] » restent deux puces, « Fluence » et
 * « Fluence : syllabes » aussi, « Dictée » et « Dictée du lundi » aussi.
 *
 * Le prix de cette frontière, assumé : deux puces qui ne diffèrent QUE par
 * leur ponctuation finale ou leur casse fusionnent. C'est le sens de la
 * correction du 21/08 : le doublon silencieux (« les maths en triple » du
 * 26/07) coûtait plus cher que ce cas de figure, qui suppose qu'une
 * enseignante ait écrit deux fois la même phrase à la ponctuation près dans
 * une même semaine.
 */
const PONCTUATION_FINALE = /[\s.,;:!?…]+$/

/**
 * Les marques diacritiques que laisse la décomposition NFD (U+0300 à U+036F),
 * écrites par leurs points de code plutôt qu'en toutes lettres : ces
 * caractères sont invisibles dans un éditeur, ils se collent au caractère
 * précédent, et une relecture de diff ne peut pas vérifier une classe de
 * caractères qu'elle ne voit pas. Même raison que les tirets de
 * `LIAISONS_INTERVALLE`.
 */
const DIACRITIQUES = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g',
)

/**
 * Les signes que deux lectures d'un même document écrivent différemment, ramenés
 * chacun à une forme unique AVANT la décomposition NFD (qui ne touche ni aux
 * ligatures ni aux apostrophes).
 *
 * Écrits par leurs points de code plutôt qu'en toutes lettres : la moitié de ces
 * caractères se distinguent mal de leur équivalent ASCII dans un diff, et le
 * tiret cadratin U+2014 est banni du dépôt en tant que caractère. Même raison
 * que `DIACRITIQUES` et `LIAISONS_INTERVALLE`.
 *
 * Ce sont des équivalences de FORME, jamais de contenu : aucune n'efface un
 * signe, chacune en choisit une écriture. Un caractère supprimé, lui, ferait
 * tomber la frontière du côté du contenu.
 */
const EQUIVALENCES_TYPO: [RegExp, string][] = [
  // Apostrophes : U+2018, U+2019, U+02BC, U+2032.
  [/[‘’ʼ′]/g, "'"],
  // Guillemets : U+201C, U+201D, U+2033, puis les chevrons français U+00AB et
  // U+00BB avec l'espace que la typographie française colle à l'intérieur
  // (souvent une insécable) : « la poule » doit se lire comme "la poule".
  [/[“”″]/g, '"'],
  [/«\s*/g, '"'],
  [/\s*»/g, '"'],
  // Points de suspension U+2026.
  [/…/g, '...'],
  // Ligatures U+0153, U+0152, U+00E6, U+00C6.
  [/œ/g, 'oe'],
  [/Œ/g, 'OE'],
  [/æ/g, 'ae'],
  [/Æ/g, 'AE'],
  // Tirets U+2010 à U+2014, plus le signe moins U+2212, écrits par leurs points
  // de code : le cadratin U+2014 ne doit pas figurer en toutes lettres ici.
  [
    new RegExp(
      `[${String.fromCharCode(0x2010)}-${String.fromCharCode(0x2014)}${String.fromCharCode(0x2212)}]`,
      'g',
    ),
    '-',
  ],
]

function normaliserTexte(texte: string): string {
  let plie = texte
  for (const [motif, remplacement] of EQUIVALENCES_TYPO) plie = plie.replace(motif, remplacement)
  const base = plie
    .normalize('NFD')
    .replace(DIACRITIQUES, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  // Un texte qui n'est QUE de la ponctuation garde sa forme : sans ce repli,
  // « ... » et « !! » auraient la même clé vide et passeraient pour la même puce.
  return base.replace(PONCTUATION_FINALE, '') || base
}

/**
 * La MÊME puce, écrite avec son domaine devant d'un côté et rangé dans le
 * champ `domaine` de l'autre : « LC : Décodage » face à « Décodage » quand
 * cette seconde séance porte déjà `domaine: 'LC'`.
 *
 * Ce cas n'est pas théorique : il vient d'une contradiction du prompt, où la
 * règle "periode" demandait « Domaine : contenu » dans `items` pendant que les
 * règles "seances" demandaient le texte de la puce dans `libelle` et l'en-tête
 * dans `domaine`. Un modèle qui obéissait aux deux rendait QUATRE séances pour
 * deux puces. La contradiction est levée dans le prompt (21/08), mais le code
 * ne doit plus dépendre de la perfection du modèle.
 *
 * COMMENT LA COMPARAISON EST ANCRÉE. On ne retire pas « ce qui ressemble à un
 * domaine » : on retire un domaine RÉELLEMENT DÉCLARÉ par l'une des deux
 * séances, et on le retire DES DEUX CÔTÉS. Une tête n'est donc jamais coupée au
 * jugé, et deux puces ne se confondent que si elles disent la même chose une
 * fois le même mot retiré devant. C'est ce qui garde distinctes
 * « LC : Voyelles, de Rimbaud » et « PDE : Voyelles, de Rimbaud » : retirer
 * « LC » ne change rien à la seconde, retirer « PDE » ne change rien à la
 * première, et les restes diffèrent dans les deux essais.
 *
 * Le séparateur entre le domaine et le texte est OPTIONNEL, parce que le
 * document de référence écrit les deux formes : « LC : La petite poule » avec
 * deux points, « Vocabulaire (séance 1) » sans. Sans cela, une séance
 * `{ domaine: 'Vocabulaire', libelle: '(séance 1)' }` face à l'item
 * « Vocabulaire (séance 1) » ressortait EN DOUBLE, défaut mesuré le 21/08 en
 * exécutant la chaîne complète sur une réponse mêlant les deux formats.
 *
 * CE QUI N'EST PLUS EXIGÉ (points 1 et 2 de la relecture). La condition
 * précédente réclamait un `domaine` non vide du côté COURT, et rien du côté
 * long. C'était exiger du modèle une perfection que le prompt ne demande pas :
 * une puce « LC : Décodage » face à une séance « Décodage » au `domaine` vide
 * ressortait en double, indéfiniment. Or ce champ est souvent vide, puisqu'il
 * est dérivé du texte dès qu'une conversion passe par ici, et qu'une puce sans
 * deux points n'en dérive aucun.
 *
 * PRIX ASSUMÉ : « Geste d'écriture : a » avale désormais une puce « a » écrite
 * seule à côté dans la même semaine, puisque « Geste d'écriture » est un domaine
 * déclaré (dérivé) de la première. Les deux situations sont structurellement
 * indiscernables, il fallait choisir laquelle payer. Le doublon, lui, frappe
 * TOUTES les puces d'un document dont le modèle range le domaine à part ;
 * l'autre suppose qu'une enseignante écrive dans la même semaine une puce
 * réduite à la fin d'une autre.
 */
function sansTeteNormalisee(libelle: string, domaine: string): string {
  if (!domaine || !libelle.startsWith(domaine)) return libelle
  const suite = libelle.slice(domaine.length)
  // Le domaine doit être un mot entier : « Le » n'est pas la tête de
  // « Lecture offerte ». `normaliserTexte` ayant déjà retiré accents et
  // ligatures et tout mis en minuscules, `[a-z0-9]` décrit ici « une lettre ou
  // un chiffre ».
  if (suite && /[a-z0-9]/.test(suite[0])) return libelle
  return suite.replace(/^\s*:?\s*/, '')
}

/**
 * Deux séances décrivent-elles la MÊME puce du document ?
 *
 * Même libellé une fois normalisé (voir `normaliserTexte` pour la frontière
 * exacte de la tolérance), ou même libellé une fois retiré des deux côtés un
 * domaine que l'une des deux déclare (voir `sansTeteNormalisee`).
 *
 * Le jour ne fait PAS partie de l'identité d'une puce : c'est `completerSeances`
 * qui s'en sert pour départager deux séances candidates, pas pour décider si
 * deux textes parlent de la même chose.
 */
function memePuce(a: SeanceProgression, b: SeanceProgression): boolean {
  const texteA = normaliserTexte(a.libelle)
  const texteB = normaliserTexte(b.libelle)
  if (texteA === texteB) return true
  for (const declare of [a.domaine, b.domaine]) {
    const domaine = normaliserTexte(declare)
    if (!domaine) continue
    if (sansTeteNormalisee(texteA, domaine) === sansTeteNormalisee(texteB, domaine)) return true
  }
  return false
}

/** Longueur du texte utile, espaces normalisés : sert à choisir laquelle de deux
 *  écritures d'une même puce porte le plus de ce que l'enseignante a écrit. */
function longueurUtile(texte: string): number {
  return texte.replace(/\s+/g, ' ').trim().length
}

/**
 * Réunit une séance rendue par le modèle et l'item qui décrit la même puce.
 *
 * Deux arbitrages, dans cet ordre :
 *
 * - LE JOUR : celui écrit dans le texte de l'item l'emporte, comme dans
 *   `seanceDepuisTexte`. Une séance `{ jour: 1, libelle: 'Dictée' }` en face
 *   d'un item « Jour 2 : Dictée » ressort au jour 2, et non plus au jour 1 en
 *   faisant disparaître le « Jour 2 » écrit par l'enseignante. Quand l'item ne
 *   dit rien de la journée, la séance garde la sienne (le modèle a pu lire une
 *   colonne du tableau que le texte ne porte pas).
 * - LE LIBELLÉ : voir `libelleRetenu`.
 *
 * Le résultat repasse par `seanceDepuisTexte` pour que la séance fusionnée
 * obéisse aux mêmes règles que toutes les autres (préfixe, intervalle, domaine
 * dérivé, domaine réécrit devant le texte).
 */
function fusionner(seance: SeanceProgression, item: SeanceProgression): SeanceProgression {
  const jour = jourValide(item.jour) ? item.jour : seance.jour
  const libelle = libelleRetenu(seance.libelle, item.libelle)
  return seanceDepuisTexte(libelle, jour, seance.domaine || item.domaine) ?? seance
}

/**
 * Des deux écritures d'une même puce, celle qui est gardée.
 *
 * LE DÉFAUT CORRIGÉ LE 21/08 (BLOQUANT 2 de la relecture). La règle était « la
 * plus longue gagne, la séance l'emportant à égalité ». Or une différence
 * d'accent, de casse ou d'apostrophe ne change PAS la longueur : la séance
 * gagnait, donc le texte du modèle remplaçait celui de l'item. Mesuré :
 * `items: ['Le graphème où']` face à une séance « Le graphème ou » ressortait
 * en « Le graphème ou ». « ou » et « où » sont deux graphèmes distincts au
 * programme de CP : une puce du document disparaissait, remplacée par une
 * autre. Pareil pour « Le son [é] » réécrit « Le son [e] », et « Dictée »
 * réécrit « DICTEE ».
 *
 * Trois cas, dans cet ordre :
 *
 * 1. les deux textes ne diffèrent que par leurs ESPACES : il n'y a rien à
 *    arbitrer, ils disent exactement la même chose. On garde la forme de la
 *    séance, déjà nettoyée, plutôt que les espaces doubles ou insécables d'un
 *    copier-coller ;
 * 2. la séance CONTIENT l'item une fois normalisée et en dit plus long : elle
 *    gagne. C'est le seul cas où une différence de longueur est une différence
 *    de contenu, et c'est celui du domaine (« LC : Décodage » face à
 *    « Décodage ») ;
 * 3. sinon L'ITEM gagne, y compris à longueur égale. C'est le texte que
 *    l'enseignante voit et que la base enregistre : entre deux écritures que la
 *    tolérance a déclarées équivalentes, c'est la sienne qui reste.
 */
function libelleRetenu(libelleSeance: string, libelleItem: string): string {
  const espacesSeance = libelleSeance.replace(/\s+/g, ' ').trim()
  const espacesItem = libelleItem.replace(/\s+/g, ' ').trim()
  if (espacesSeance === espacesItem) return libelleSeance

  const normaliseeSeance = normaliserTexte(libelleSeance)
  const normaliseeItem = normaliserTexte(libelleItem)
  const seanceEnDitPlus = normaliseeSeance !== normaliseeItem
    && normaliseeSeance.includes(normaliseeItem)
    && longueurUtile(libelleSeance) > longueurUtile(libelleItem)
  return seanceEnDitPlus ? libelleSeance : libelleItem
}

/**
 * Complète des séances rendues par le modèle avec les items qu'aucune d'elles
 * ne reprend, chaque rescapé devenant une séance à son tour.
 *
 * LE GARDE-FOU ANTI-DESTRUCTION (20/08/2026). Avant, une seule séance rendue
 * par le modèle suffisait à faire régénérer `items` entièrement depuis les
 * séances : les trois autres apprentissages de la semaine disparaissaient de
 * l'écran ET de la base, sans un mot. Un modèle qui répond à moitié ne doit
 * jamais pouvoir effacer le document de l'enseignante. C'est « signaler,
 * jamais deviner » appliqué aux données : au pire, une séance sans jour.
 *
 * EN SORTIE, `items` PEUT ÊTRE RÉÉCRIT DEPUIS LE RÉSULTAT, mais pas « sans rien
 * perdre » comme il était écrit ici jusqu'au 21/08. Ce qui est vrai : chaque
 * puce reçue a sa séance, et chaque séance son item, donc aucune LIGNE ne
 * disparaît. Ce qui est faux : les deux écritures d'une même puce n'en donnent
 * qu'une seule en sortie, celle que `libelleRetenu` garde, et la tolérance de
 * `normaliserTexte` fait qu'elles peuvent différer par une casse, un accent, une
 * apostrophe ou une ponctuation finale. La perte est bornée à ce que la
 * tolérance couvre, elle n'est pas nulle. Et deux autres cas, documentés là où
 * ils vivent, réécrivent vraiment le texte : un préfixe de jour qui en cache un
 * second (`itemsDepuisSeances`) et un domaine trop long pour être reposé devant
 * la puce (`avecDomaine`).
 *
 * L'ORDRE DE SORTIE suit l'ordre de lecture du document, c'est-à-dire l'ordre
 * de `items` : une séance prend le rang de l'item qu'elle couvre, un item
 * orphelin garde le sien, et une séance qu'aucun item ne reprend se glisse
 * juste derrière la dernière séance placée. Avant le 21/08 le résultat était
 * `[...seances, ...orphelines]` : quatre puces « Fluence, Dictée, Copie,
 * Graphisme » dont le modèle n'avait rendu que la dernière en séance
 * ressortaient dans l'ordre « Graphisme, Fluence, Dictée, Copie ». La matinée
 * de l'enseignante était réordonnée par le hasard de ce que le modèle avait
 * rendu, et la tâche 5 posera la séance i dans le créneau i.
 *
 * La comparaison vit ici, avec le reste de ce qui connaît le préfixe. Un item
 * « correspond » à une séance quand `memePuce` les reconnaît (frontière de
 * tolérance documentée sur `normaliserTexte`). À libellé égal, une séance du
 * MÊME jour est préférée à une séance datée autrement : sinon deux puces
 * identiques posées à deux jours différents risqueraient d'échanger leurs
 * journées selon l'ordre de lecture.
 *
 * Chaque séance ne couvre qu'UN item : deux puces identiques dans le document
 * restent deux séances, comme deux séances identiques ne se dédoublonnent pas.
 */
export function completerSeances(
  seances: SeanceProgression[],
  items: unknown[] | null | undefined,
): SeanceProgression[] {
  // Les séances reçues repassent par la lecture commune : personne ne peut
  // entrer ici avec un libellé encore préfixé, un intervalle daté, ou un
  // libellé vide qui fabriquerait un créneau sans texte.
  const retenues = seances.flatMap(s => {
    const propre = seanceDepuisTexte(s.libelle, s.jour, s.domaine)
    return propre ? [propre] : []
  })
  const libres = retenues.map((_, index) => index)
  const rangs = new Map<number, number>()
  const orphelines: { rang: number; seance: SeanceProgression }[] = []

  seancesDepuisItems(items).forEach((candidate, rang) => {
    let pos = libres.findIndex(
      i => retenues[i].jour === candidate.jour && memePuce(retenues[i], candidate),
    )
    if (pos === -1) pos = libres.findIndex(i => memePuce(retenues[i], candidate))
    if (pos === -1) {
      orphelines.push({ rang, seance: candidate })
      return
    }
    const index = libres[pos]
    libres.splice(pos, 1)
    retenues[index] = fusionner(retenues[index], candidate)
    rangs.set(index, rang)
  })

  // Rang de sortie : celui de l'item couvert. Une séance sans item se range
  // juste après la dernière séance placée (rang + 0.5), ce qui garde l'ordre
  // relatif des séances entre elles sans jamais tomber sur le rang d'un item.
  const classees: { rang: number; seance: SeanceProgression }[] = []
  let dernier = -1
  retenues.forEach((seance, index) => {
    const rang = rangs.get(index)
    if (rang !== undefined) dernier = rang
    classees.push({ rang: rang ?? dernier + 0.5, seance })
  })
  for (const orpheline of orphelines) classees.push(orpheline)
  return classees.sort((a, b) => a.rang - b.rang).map(c => c.seance)
}

/**
 * Reconstruit les items texte à partir des séances, pour tout ce qui lit
 * encore `items` (l'affichage existant, en attendant une migration qui
 * lirait des séances directement).
 *
 * Idempotente : si `libelle` porte déjà un préfixe "Jour N :" (l'IA qui
 * remplit `seances` recopie volontiers la puce entière), il est retiré
 * avant de reposer le préfixe issu du champ `jour`, pour ne jamais doubler
 * en "Jour 3 : Jour 3 : Fluence".
 *
 * MÊME GARDE-FOU QUE `seanceDepuisTexte`, et pour la même raison (21/08/2026) :
 * cette fonction lisait le préfixe avec `PREFIXE_JOUR` seul, donc ignorait les
 * intervalles. Dès que le modèle remplissait `jour` lui-même, ce que les
 * consignes lui demandent justement de faire, une séance
 * `{ jour: 3, libelle: 'Jours 3-4 : révisions' }` ressortait en
 * « Jour 3 : 4 : révisions », et le doublon grossissait à chaque passage : la
 * séance gardait son texte, l'item devenait « 4 : révisions », et les deux ne
 * se reconnaissaient plus jamais. Les deux conversions passent maintenant par
 * `lirePrefixeJour`.
 *
 * Le libellé est rendu TEL QUEL, sans préfixe reposé, dans trois cas :
 *
 * - `jour` n'est pas un entier strictement positif (`null`, `0`, une valeur
 *   négative ou non entière comme `2.5`) : on ne date pas ce qu'on ne peut pas
 *   réattribuer avec certitude ;
 * - le texte parle de jours sans en désigner un seul (« Jours 3-4 »,
 *   « Jour 0 ») : le texte prime, et il dit déjà ce qu'il a à dire ;
 * - le texte porte un préfixe de jour DIFFÉRENT de `jour`. Le champ `jour`
 *   gagnait ici en silence : « Jour 5 : Fluence » avec `jour: 3` ressortait en
 *   « Jour 3 : Fluence » et le 5 du document disparaissait. C'est le texte qui
 *   tranche, comme dans `seanceDepuisTexte`. Contrairement à ce qui était écrit
 *   ici jusqu'au 21/08, ce cas n'est PAS réservé aux séances fabriquées
 *   ailleurs : une séance passée par ce module peut très bien se contredire
 *   ainsi, `seanceDepuisTexte('Jour 3 : Jour 4 : Fluence')` rendant
 *   `{ jour: 3, libelle: 'Jour 4 : Fluence' }`. Le texte tranche donc pour de
 *   bon, et le « Jour 3 » du document ne se voit plus. Signalé plutôt que
 *   deviné : les deux rangs restent lisibles dans la puce d'origine.
 *
 * LE DOMAINE, LUI, EST ÉCRIT (21/08, décision de Christophe). `avecDomaine` le
 * repose devant le texte quand le libellé ne le porte pas. Dans la chaîne
 * normale c'est déjà fait par `seanceDepuisTexte` et l'appel ne change rien ;
 * il sert aux séances qui arrivent d'ailleurs (une ligne enregistrée en base
 * avant cette correction, par exemple), pour que le domaine atteigne l'écran
 * quel que soit le chemin emprunté.
 */
export function itemsDepuisSeances(seances: SeanceProgression[]): string[] {
  return seances.map(s => {
    const texte = avecDomaine(s.libelle, s.domaine.trim())
    const lu = lirePrefixeJour(texte)
    if (lu.ambigu) return texte
    if (lu.jour !== null && lu.jour !== s.jour) return texte
    if (!jourValide(s.jour)) return texte
    return `Jour ${s.jour} : ${lu.libelle}`
  })
}
