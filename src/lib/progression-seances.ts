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
 * les deux points, plus la virgule et les mots « et », « à », « a ». Le point
 * en fait donc partie depuis le 21/08 : « Jours 3.4 : révisions » et
 * « Jour 3. 4 : révisions » sortaient encore en « Jour 3 : 4 : révisions ».
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
 * LIMITE CONNUE, non refermée ici. `cahier-journal.ts` lit encore `items` avec
 * `PREFIXE_JOUR` seul (`numeroJourItem`, `itemsDuJour`) : un item d'intervalle
 * y est donc toujours daté au premier des deux jours et affiché amputé de son
 * début. Le corriger demande de faire passer ce module-là par
 * `lirePrefixeJour`, ce que la tâche 5 du plan (« Une séance par créneau »)
 * refait de toute façon. Tant qu'elle n'est pas faite, l'import ne fabrique
 * plus d'item déformé, mais l'affichage peut encore en déformer un venu d'une
 * ligne enregistrée avant cette correction.
 */
const LIAISONS_INTERVALLE = `[-.,${String.fromCharCode(0x2013, 0x2014)}]`
const INTERVALLE_JOURS = new RegExp(
  `^\\s*jours?\\s*\\d+\\s*(?:${LIAISONS_INTERVALLE}\\s*|\\s+(?:et|à|a)\\s+)\\d+`,
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
 */
function lirePrefixeJour(texte: string): LecturePrefixeJour {
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
 *   en-tête de colonne absent du libellé), sinon il est dérivé du libellé.
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
  return {
    jour,
    domaine: domaineModele.trim() || domaineDe(lu.libelle),
    libelle: lu.libelle,
  }
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
 * - la ponctuation FINALE (« Découverte du son [a]. » et « … [a] »).
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

function normaliserTexte(texte: string): string {
  const base = texte
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
 * La condition est volontairement étroite : le préfixe retiré doit être
 * exactement le domaine que porte l'AUTRE séance, celle qui ne l'écrit pas
 * dans son texte. Sans cette exigence, « Jours 3-4 : révisions » et
 * « Jours 5-6 : révisions » se confondraient (leur queue est la même), et
 * « Geste d'écriture : a » avalerait une puce « a ». Retirer de chaque côté son
 * PROPRE domaine, dérivé du texte, aurait exactement ces deux défauts : le
 * domaine dérivé n'est qu'un morceau du texte pris avant les deux points, il ne
 * prouve rien.
 */
function memePuceAuDomainePres(longue: SeanceProgression, courte: SeanceProgression): boolean {
  const domaine = normaliserTexte(courte.domaine)
  if (!domaine) return false
  const coupe = longue.libelle.indexOf(':')
  if (coupe < 1) return false
  if (normaliserTexte(longue.libelle.slice(0, coupe)) !== domaine) return false
  return normaliserTexte(longue.libelle.slice(coupe + 1)) === normaliserTexte(courte.libelle)
}

/**
 * Deux séances décrivent-elles la MÊME puce du document ?
 *
 * Même libellé une fois normalisé (voir `normaliserTexte` pour la frontière
 * exacte de la tolérance), ou même libellé au domaine près, dans un sens ou
 * dans l'autre (voir `memePuceAuDomainePres`).
 *
 * Le jour ne fait PAS partie de l'identité d'une puce : c'est `completerSeances`
 * qui s'en sert pour départager deux séances candidates, pas pour décider si
 * deux textes parlent de la même chose.
 */
function memePuce(a: SeanceProgression, b: SeanceProgression): boolean {
  if (normaliserTexte(a.libelle) === normaliserTexte(b.libelle)) return true
  return memePuceAuDomainePres(a, b) || memePuceAuDomainePres(b, a)
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
 * - LE LIBELLÉ : la version la plus longue gagne, à espaces normalisés, la
 *   séance l'emportant à égalité. C'est ce qui évite de perdre le « LC : » d'un
 *   item « LC : Décodage » en faveur du « Décodage » de la séance : le domaine
 *   survit dans le champ `domaine`, mais `itemsDepuisSeances` ne le réécrit
 *   pas, donc il aurait disparu de l'écran au premier enregistrement.
 *
 * Le résultat repasse par `seanceDepuisTexte` pour que la séance fusionnée
 * obéisse aux mêmes règles que toutes les autres (préfixe, intervalle, domaine
 * dérivé).
 */
function fusionner(seance: SeanceProgression, item: SeanceProgression): SeanceProgression {
  const jour = jourValide(item.jour) ? item.jour : seance.jour
  const libelle = longueurUtile(item.libelle) > longueurUtile(seance.libelle)
    ? item.libelle
    : seance.libelle
  return seanceDepuisTexte(libelle, jour, seance.domaine || item.domaine) ?? seance
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
 * En sortie, `items` est réécrit depuis le résultat sans rien perdre : chaque
 * puce reçue a sa séance, et chaque séance son item. Un libellé peut y avoir
 * changé de FORME (celle des deux écritures qui portait le plus de texte, voir
 * `fusionner`), jamais de contenu.
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
 *   tranche, comme dans `seanceDepuisTexte`. Une séance passée par ce module
 *   ne peut de toute façon plus se contredire ainsi ; le cas ne subsiste que
 *   pour une séance fabriquée ailleurs.
 */
export function itemsDepuisSeances(seances: SeanceProgression[]): string[] {
  return seances.map(s => {
    const lu = lirePrefixeJour(s.libelle)
    if (lu.ambigu) return s.libelle
    if (lu.jour !== null && lu.jour !== s.jour) return s.libelle
    if (!jourValide(s.jour)) return s.libelle
    return `Jour ${s.jour} : ${lu.libelle}`
  })
}
