import type { SeanceProgression } from '@/types'
import { sansAccents } from '@/data/trame-edt'

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
 * DEUX LECTURES, UNE PAR CÔTÉ. Le libellé d'une séance dit de quoi elle parle ;
 * le nom d'un créneau dit ce qu'il accueille (« Compréhension écrite ou
 * production d'écrits » en accueille deux). Les deux tables se ressemblent mais
 * ne sont pas la même : « Ecriture » comme nom de créneau désigne le geste
 * d'écriture, alors que dans un libellé « Écriture d'une phrase » est de la
 * production d'écrits. Les mots se comparent ENTIERS, sans accents, sans
 * ponctuation et sans la marque du pluriel, pour que « LC » ne se trouve pas
 * dans « calcul » et que « graphèmes » rejoigne « graphème ».
 *
 * Ce qui n'est volontairement dans AUCUNE table :
 * - « lecture » seule : elle figure dans « Graphèmes e et é (phono, lecture) »,
 *   qui est de la phonologie, pas de la compréhension ;
 * - « oral » seul : « Lecture orale » n'est pas du langage oral. Et une
 *   compréhension ou une production suivie de « oral(e) » ne vaut ni LC ni PDE ;
 * - fluence, lettres muettes, prénoms de la classe, dictée : Christophe a
 *   confirmé le 17/10 que ces séances n'ont pas de créneau chez Cécile et
 *   restent à placer.
 */
export type FamilleSeance =
  | 'phonologie'
  | 'etudeLangue'
  | 'ecriture'
  | 'comprehension'
  | 'productionEcrits'
  | 'langageOral'

type Table = ReadonlyArray<readonly [FamilleSeance, readonly string[]]>

// Les mots sont écrits comme `mots` les rend : sans accents, au singulier.
const PHONOLOGIE = ['phonologie', 'phono', 'phoneme', 'grapheme', 'encodage', 'decodage']
const ETUDE_LANGUE = ['etude de la langue', 'vocabulaire', 'grammaire', 'orthographe', 'conjugaison']

/** Ce dont parle le libellé d'une séance. */
const TABLE_SEANCE: Table = [
  ['phonologie', PHONOLOGIE],
  ['etudeLangue', ETUDE_LANGUE],
  // Pas « écriture » seule : voir `estEcritureSeule`.
  ['ecriture', ['geste d ecriture', 'graphisme', 'copie']],
  ['comprehension', ['comprehension', 'lc']],
  ['productionEcrits', ['production', 'pde']],
  ['langageOral', ['langage oral']],
]

/** Ce qu'accueille un créneau, d'après son nom. */
const TABLE_CRENEAU: Table = [
  ['phonologie', PHONOLOGIE],
  ['etudeLangue', ETUDE_LANGUE],
  ['ecriture', ['ecriture', 'graphisme', 'copie']],
  ['comprehension', ['comprehension', 'lc']],
  // « production » seul suffit : il couvre la faute de frappe réelle
  // « production d'cérits » d'un créneau de Cécile.
  ['productionEcrits', ['production', 'pde']],
  ['langageOral', ['langage oral']],
]

/**
 * Ce qu'on efface avant de chercher, parce que le mot y trompe :
 * - « compréhension orale », « production orale » ne sont ni LC ni PDE ;
 * - « Lecture-écriture » (créneau de la trame par défaut) est une séance de
 *   lecture et d'encodage, pas le geste d'écriture.
 */
const TROMPEURS = / (?:comprehension|production) orale? | lecture ecriture /g

/** Mots d'un texte : `sansAccents`, puis la marque du pluriel retirée. */
export function mots(texte: string): string {
  return sansAccents(texte)
    .split(' ')
    .map(m => (m.length > 3 && m.endsWith('s') ? m.slice(0, -1) : m))
    .join(' ')
}

/** Vrai quand le texte (déjà passé par `mots`) contient ce mot ou cette expression, entier. */
export function contient(texte: string, mot: string): boolean {
  return ` ${texte} `.includes(` ${mot} `)
}

/** Chaque famille désignée, avec les mots de la table qui l'ont désignée. */
function lire(texte: string, table: Table): Map<FamilleSeance, string[]> {
  // Remplacé deux fois : deux expressions trompeuses côte à côte partagent
  // l'espace qui les sépare, et la première passe saute la seconde.
  const cherche = ` ${mots(texte)} `.replace(TROMPEURS, '  ').replace(TROMPEURS, '  ').trim()
  const trouve = new Map<FamilleSeance, string[]>()
  for (const [famille, liste] of table) {
    const touches = liste.filter(mot => contient(cherche, mot))
    if (touches.length) trouve.set(famille, touches)
  }
  return trouve
}

/**
 * Un libellé qui n'est QUE « Écriture », éventuellement suivi d'une
 * parenthèse (« Écriture (S2) »). Tout ce qui va plus loin (« Écriture d'une
 * phrase », « Lecture et écriture de syllabes ») ne décide rien.
 */
function estEcritureSeule(libelle: string): boolean {
  return sansAccents(libelle.replace(/\([^()]*\)\s*$/, '')) === 'ecriture'
}

function lireSeance(s: SeanceProgression): Map<FamilleSeance, string[]> {
  const trouve = lire(`${s.domaine} ${s.libelle}`, TABLE_SEANCE)
  if (estEcritureSeule(s.libelle) && !trouve.has('ecriture')) trouve.set('ecriture', ['ecriture'])
  return trouve
}

/** Les familles dont parle une séance, dans l'ordre de la table. */
export function famillesSeance(libelle: string, domaine = ''): FamilleSeance[] {
  const trouve = lireSeance({ jour: null, domaine, libelle })
  return TABLE_SEANCE.map(([f]) => f).filter(f => trouve.has(f))
}

/** Les familles qu'accueille un créneau, dans l'ordre de la table. */
export function famillesCreneau(nom: string): FamilleSeance[] {
  return [...lire(nom, TABLE_CRENEAU).keys()]
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
 * 1. Une séance qui ne désigne qu'UNE famille vise les créneaux qui accueillent
 *    cette famille ce jour-là :
 *    - tous du même nom : le premier libre la prend. Deux « Etude de la
 *      langue » reçoivent le Vocabulaire puis la Grammaire ;
 *    - de noms différents : seul un nom qui ÉCRIT le mot de la séance peut
 *      trancher (« Graphème L » va dans « Appropriation des graphèmes » plutôt
 *      que dans « Phonologie »). S'il n'y en a pas exactement un, c'est
 *      « plusieurs possibles » au sens de la décision du 17/10 : la séance part
 *      à placer, et jamais dans un créneau générique ;
 *    - aucun : elle reste pour le créneau générique.
 * 2. Une séance à zéro ou plusieurs familles (« Vocabulaire et PDE (S8) ») ne
 *    se place pas par famille.
 * 3. Un créneau GÉNÉRIQUE (son nom n'est que la matière, « Français ») prend
 *    ensuite, dans l'ordre, ce qui n'a pas été placé : séances sans famille ou à
 *    plusieurs familles, séances dont la famille n'a aucun créneau ce jour-là
 *    ou dont le créneau est déjà pris. « Ateliers de français » n'est pas
 *    générique : il ne reçoit jamais rien tout seul.
 * 4. Le reste est rendu à l'appelant, dans l'ordre du document, qui le met
 *    « à placer ». Chaque séance finit dans exactement un créneau ou dans les
 *    restantes.
 */
export function repartirSeances(
  nomsCreneaux: string[],
  seances: SeanceProgression[],
  estGenerique: (nomCreneau: string) => boolean,
): Repartition {
  const famillesParCreneau = nomsCreneaux.map(famillesCreneau)
  const cles = nomsCreneaux.map(mots)
  const parCreneau: (SeanceProgression | null)[] = nomsCreneaux.map(() => null)
  const placees = new Set<SeanceProgression>()
  const ambigues = new Set<SeanceProgression>()

  /** Nom (sous sa forme `mots`) du créneau visé, `null` s'il n'y en a aucun. */
  const cible = (famille: FamilleSeance, motsSeance: string[]): string | null | 'ambigu' => {
    const noms = [...new Set(cles.filter((_, i) => famillesParCreneau[i].includes(famille)))]
    if (noms.length <= 1) return noms[0] ?? null
    const precis = noms.filter(nom => motsSeance.some(mot => contient(nom, mot)))
    return precis.length === 1 ? precis[0] : 'ambigu'
  }

  for (const s of seances) {
    const lu = lireSeance(s)
    if (lu.size !== 1) continue
    const [[famille, motsSeance]] = [...lu]
    const nom = cible(famille, motsSeance)
    if (nom === 'ambigu') {
      ambigues.add(s)
      continue
    }
    const libre = nom === null ? -1 : cles.findIndex((cle, i) =>
      parCreneau[i] === null && cle === nom && famillesParCreneau[i].includes(famille))
    if (libre >= 0) {
      parCreneau[libre] = s
      placees.add(s)
    }
  }

  for (const s of seances) {
    if (placees.has(s) || ambigues.has(s)) continue
    const libre = nomsCreneaux.findIndex((nom, i) =>
      parCreneau[i] === null && famillesParCreneau[i].length === 0 && estGenerique(nom))
    if (libre >= 0) {
      parCreneau[libre] = s
      placees.add(s)
    }
  }

  return { parCreneau, restantes: seances.filter(s => !placees.has(s)) }
}
