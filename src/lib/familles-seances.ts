import type { SeanceProgression } from '@/types'

/**
 * Familles de séance : placer une séance de français PAR LE SENS.
 *
 * DÉCISION DE CHRISTOPHE DU 17/10/2026. Une séance va dans le créneau dont le
 * NOM lui correspond sans hésitation : Vocabulaire ou Grammaire vers « Etude de
 * la langue », Geste d'écriture vers « Ecriture », Graphème vers « Phonologie »,
 * LC vers « Compréhension », PDE vers « Production d'écrits ». Aucun créneau, ou
 * plusieurs possibles : la séance part dans « à placer » et l'enseignante la
 * pose elle-même. Jamais de devinette (règle du 31/07).
 *
 * POURQUOI LE REMPLISSAGE DANS L'ORDRE A ÉTÉ ABANDONNÉ. Jusqu'au 17/10, chaque
 * créneau de français prenait la séance suivante du jour, quel que soit son
 * nom (commit d61b1ad). Cécile a 5 à 6 créneaux de français par jour pour 2 à
 * 4 séances : le jeudi de sa semaine 3 mettait « Vocabulaire » dans « Ateliers
 * de français » et « Geste d'écriture » dans « Etude de la langue », pendant
 * que « Ecriture » restait vide. Un cahier journal faux qui a l'air juste est
 * pire qu'un cahier journal vide : personne ne le relit.
 *
 * LA MÊME TABLE sert aux deux côtés : appliquée au libellé d'une séance, elle
 * dit de quoi parle la séance ; appliquée au nom d'un créneau, elle dit ce que
 * le créneau accueille (« Compréhension écrite ou production d'écrits » en
 * accueille deux). Les mots se comparent ENTIERS, sur un texte sans accents ni
 * ponctuation, pour que « LC » ne se trouve pas dans « calcul ».
 *
 * Ce qui n'est volontairement PAS dans la table :
 * - « lecture » seule : elle figure dans « Graphèmes e et é (phono, lecture) »,
 *   qui est de la phonologie, pas de la compréhension ;
 * - « dictée », « fluence », « lettres muettes » : chacune pourrait aller dans
 *   deux créneaux de Cécile. Plutôt « à placer » qu'un mauvais créneau.
 */
export type FamilleSeance =
  | 'phonologie'
  | 'etudeLangue'
  | 'ecriture'
  | 'comprehension'
  | 'productionEcrits'
  | 'langageOral'

const MOTS_PAR_FAMILLE: ReadonlyArray<readonly [FamilleSeance, readonly string[]]> = [
  ['phonologie', ['phonologie', 'phono', 'phoneme', 'phonemes', 'grapheme', 'graphemes', 'encodage', 'decodage']],
  ['etudeLangue', ['etude de la langue', 'vocabulaire', 'grammaire', 'orthographe', 'conjugaison']],
  ['ecriture', ['ecriture', 'graphisme', 'copie']],
  ['comprehension', ['comprehension', 'lc']],
  // « production » seul suffit : il couvre la faute de frappe réelle
  // « production d'cérits » d'un créneau de Cécile. Une « production orale »
  // porterait aussi la famille du langage oral, donc deux familles : à placer.
  ['productionEcrits', ['production', 'pde']],
  ['langageOral', ['langage oral', 'oral', 'orale']],
]

/**
 * Expressions qui ne disent rien de sûr et qu'on retire avant de chercher.
 * « Lecture-écriture » (créneau de la trame par défaut) désigne une séance de
 * lecture et d'encodage, pas le geste d'écriture : le mot « écriture » y
 * tromperait.
 */
const EXPRESSIONS_NEUTRES: readonly string[] = ['lecture ecriture']

/** Minuscules, sans accents, chaque suite de signes réduite à un espace. */
export function normaliserIntitule(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[Œœ]/g, 'oe')
    .toLocaleLowerCase('fr-FR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Les familles qu'un texte (libellé de séance ou nom de créneau) désigne, dans
 * l'ordre de la table. Vide quand rien ne parle sans hésitation.
 */
export function famillesDe(texte: string): FamilleSeance[] {
  let cherche = ` ${normaliserIntitule(texte)} `
  for (const neutre of EXPRESSIONS_NEUTRES) cherche = cherche.split(` ${neutre} `).join('  ')
  return MOTS_PAR_FAMILLE
    .filter(([, mots]) => mots.some(mot => cherche.includes(` ${mot} `)))
    .map(([famille]) => famille)
}

/** Familles d'une séance : son libellé, et son domaine s'il n'y est pas écrit. */
function famillesSeance(s: SeanceProgression): FamilleSeance[] {
  return famillesDe(`${s.domaine} ${s.libelle}`)
}

export type Repartition = {
  /** La séance posée dans chaque créneau, dans l'ordre reçu, ou `null`. */
  parCreneau: (SeanceProgression | null)[]
  /** Ce qui n'a trouvé aucun créneau sûr, dans l'ordre du document. */
  restantes: SeanceProgression[]
}

/**
 * Répartit les séances d'UN jour entre les créneaux de cours d'UNE progression.
 *
 * 1. Une séance qui ne désigne qu'UNE famille va dans le premier créneau libre
 *    qui accueille cette famille. Plusieurs créneaux du MÊME nom se partagent
 *    les séances de la famille dans l'ordre (deux « Etude de la langue » : le
 *    Vocabulaire puis la Grammaire). Mais si la famille est accueillie ce
 *    jour-là par des créneaux de noms DIFFÉRENTS, c'est « plusieurs possibles »
 *    au sens de la décision du 17/10 : on ne choisit pas, elle reste.
 * 2. Une séance à zéro ou plusieurs familles (« Vocabulaire et PDE (S8) ») ne
 *    se place pas par famille.
 * 3. Un créneau GÉNÉRIQUE (son nom n'est que la matière, « Français ») prend
 *    ensuite, dans l'ordre, ce qui reste. Il garde utilisables les emplois du
 *    temps simples. « Ateliers de français » n'est pas générique : il ne reçoit
 *    jamais rien tout seul.
 * 4. Le reste est rendu à l'appelant, qui le met « à placer ». Chaque séance
 *    finit donc dans exactement un créneau ou dans les restantes.
 */
export function repartirSeances(
  nomsCreneaux: string[],
  seances: SeanceProgression[],
  estGenerique: (nomCreneau: string) => boolean,
): Repartition {
  const famillesCreneau = nomsCreneaux.map(famillesDe)
  const parCreneau: (SeanceProgression | null)[] = nomsCreneaux.map(() => null)

  // Une famille est ambiguë ce jour-là quand des créneaux de noms différents
  // l'accueillent. Calculé une fois pour toutes : le résultat ne dépend pas de
  // l'ordre des séances.
  const nomsParFamille = new Map<FamilleSeance, Set<string>>()
  famillesCreneau.forEach((familles, i) => {
    for (const f of familles) {
      const noms = nomsParFamille.get(f) ?? new Set<string>()
      noms.add(normaliserIntitule(nomsCreneaux[i]))
      nomsParFamille.set(f, noms)
    }
  })

  const nonPlacees: SeanceProgression[] = []
  for (const s of seances) {
    const familles = famillesSeance(s)
    const f = familles.length === 1 ? familles[0] : null
    const libre = f !== null && nomsParFamille.get(f)?.size === 1
      ? famillesCreneau.findIndex((fc, i) => parCreneau[i] === null && fc.includes(f))
      : -1
    if (libre >= 0) parCreneau[libre] = s
    else nonPlacees.push(s)
  }

  const restantes: SeanceProgression[] = []
  for (const s of nonPlacees) {
    const libre = nomsCreneaux.findIndex((nom, i) =>
      parCreneau[i] === null && famillesCreneau[i].length === 0 && estGenerique(nom))
    if (libre >= 0) parCreneau[libre] = s
    else restantes.push(s)
  }
  return { parCreneau, restantes }
}
