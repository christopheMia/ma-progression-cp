import { mots } from '@/lib/familles-seances'
import { domaineDe } from '@/lib/progression-seances'

/**
 * Placer les NOTIONS de la semaine (maths, histoire-géographie-sciences-EMC,
 * arts) dans les créneaux qui portent leur nom.
 *
 * DÉCISION DE CHRISTOPHE DU 17/10/2026. Devant le lundi de la classe de test,
 * où « Chaque jour compte », « flash maths », « mathématiques » et « calcul
 * mental » affichaient tous les trois notions de la semaine collées par des
 * virgules : « il faut écrire des choses lisibles et structurer ». Règle
 * validée le même jour :
 * - chaque notion va dans le créneau qui porte son nom (« Problèmes : ... »
 *   dans « Problème », « Calcul mental : ... » dans « Calcul mental ») ;
 * - ce qui n'a pas de créneau à son nom ce jour-là va dans le créneau général
 *   de la matière (« Mathématiques ») ;
 * - les rituels (« Chaque jour compte », « Flash maths ») affichent leur nom.
 *   Aucun nom de rituel n'est écrit ici : un créneau qui n'est ni nommé pour
 *   une notion ni général ne reçoit rien, c'est tout ;
 * - plusieurs notions dans un créneau : une par ligne (l'appelant les joint).
 *
 * LE NOM, LITTÉRALEMENT. Le domaine d'une notion est ce qui précède ses
 * premiers deux points (`domaineDe`, la même lecture que les séances). Un
 * créneau est nommé pour une notion quand l'un de ses noms EST ce domaine,
 * sans accents et sans la marque du pluriel (`mots`, la même comparaison que
 * `familles-seances.ts`) : « problème » est « Problèmes », « Histoire,
 * géographie, sciences et technologie » énumère « Histoire », « Géographie »
 * et « Sciences ». « Calcul mental » n'est pas « Calcul » (Cécile, 18/10 :
 * poser une addition, c'est des mathématiques), « Flash maths » n'est pas
 * « Maths », « mathématiques » n'est pas « Numération ». Une barre oblique
 * sépare des domaines : « EMC/EVARS/PHARE » est nommé par « EMC ». Rien n'est
 * deviné à partir du sens d'un mot, seulement de ce que l'enseignante a tapé.
 *
 * UNE NOTION PEUT PARAÎTRE DANS PLUSIEURS CRÉNEAUX D'UN JOUR. Une notion est
 * le contenu de la semaine, pas une séance qu'on fait une fois : si deux
 * créneaux du jour la nomment (« EMC » et « EMC / Poésie »), elle est écrite
 * dans les deux. C'est la différence avec `repartirSeances`, où une séance
 * finit dans un seul créneau.
 *
 * D'UNE MATIÈRE À L'AUTRE. Un créneau peut recevoir la notion d'une autre
 * progression quand son nom l'écrit : « EMC / Poésie » est alimenté par la
 * progression d'EMC, mais il nomme la poésie, qui vit dans celle des arts. La
 * règle de Christophe dit « le créneau qui porte son nom », sans condition de
 * matière, et c'est l'enseignante qui a écrit « Poésie » dans ce créneau. Seuls
 * les créneaux « ouverts » le peuvent : jamais une routine, jamais un créneau
 * de séances datées (« Ecriture » chez Cécile reçoit son geste d'écriture,
 * pas une notion d'arts nommée « Écriture »). Et dans un créneau partagé, la
 * notion d'une autre matière n'entre que la semaine où elle est nouvelle (voir
 * `placerNotionsDuJour`).
 */

/**
 * Ce qui sépare plusieurs noms dans un nom de créneau ou un domaine :
 * « Histoire, géographie, sciences et technologie », « EMC / Poésie »,
 * « Etude de la langue : vocabulaire ou grammaire ». Le trait d'union n'en est
 * pas un : « Lecture-écriture » est UN nom, pas « Lecture » et « Écriture ».
 */
const SEPARATEURS_DE_NOMS = /[,/;:+&()]|\s(?:et|ou)\s/i

/** Les noms qu'écrit un texte, chacun passé par `mots` (accents, pluriel). */
function nomsEcrits(texte: string): string[] {
  return texte.split(SEPARATEURS_DE_NOMS).map(n => mots(n)).filter(n => /[a-z]/.test(n))
}

/** Les domaines d'une notion, tels qu'écrits : « EMC/EVARS/PHARE » en donne trois. */
export function domainesNotion(notion: string): string[] {
  return domaineDe(notion).split('/').map(d => d.trim()).filter(d => /[a-z]/.test(mots(d)))
}

/**
 * Vrai quand l'un des noms du créneau EST l'un des domaines de la notion, mot
 * pour mot (accents et pluriel mis à part).
 *
 * Réponse de Cécile du 18/10/2026 : « poser une addition c'est des
 * mathématiques pas du calcul mental ». Jusque-là, il suffisait que le nom du
 * créneau CONTIENNE le domaine : « Calcul : ... » allait dans « Calcul
 * mental », « Maths : ... » dans « Flash maths », « Écriture : ... » dans
 * « Lecture-écriture ». Un mot de plus dans le nom (« mental », « flash »)
 * désigne une autre activité. Désormais le nom doit être le domaine, ou l'un
 * des noms qu'il énumère (« Histoire, géographie, sciences » écrit les trois).
 */
export function creneauNommePour(nomCreneau: string, notion: string): boolean {
  const noms = nomsEcrits(nomCreneau)
  return domainesNotion(notion).some(d => nomsEcrits(d).some(n => noms.includes(n)))
}

/**
 * Vrai pour un créneau PARTAGÉ entre deux activités qui alternent, écrit avec
 * une barre oblique : « EMC / Poésie ». Une liste à virgules (« Histoire,
 * géographie, sciences ») n'en est pas un : elle montre tout ce qu'elle nomme.
 */
export function estCreneauPartage(nomCreneau: string): boolean {
  return nomCreneau.includes('/')
}

/** Un créneau du jour, vu depuis les notions. */
export type CreneauNotions = {
  nom: string
  /** Rang (dans `notions`) de la progression qui l'alimente, `null` si aucune. */
  progression: number | null
  /** Son nom n'est que celui de la matière (« Mathématiques », « Maths », « EMC »). */
  general: boolean
  /** Peut recevoir des notions : ni une routine, ni un créneau de séances datées. */
  ouvert: boolean
}

/** Une notion désignée par sa progression et son rang dans ses items. */
export type NotionPlacee = { progression: number; rang: number }

/**
 * Pour une notion qui relève d'une règle du carnet de rangement : les rangs,
 * dans les créneaux du jour, des cases où la règle la met (ensemble vide : pas
 * ce jour-là). `undefined` : pas de règle, la notion se place par son nom.
 * Calculé par `cahier-journal.ts`, qui connaît le jour et les règles.
 */
export type CasesDeRegle = (progression: number, rang: number) => Set<number> | undefined

/**
 * Les notions de chaque créneau d'UN jour, dans l'ordre des créneaux.
 *
 * `notions[k]` est la liste des notions de la progression de rang k (vide pour
 * une progression qui n'est pas de notions). Dans un créneau, les notions de
 * sa propre progression viennent d'abord, puis celles des autres, chacune dans
 * l'ordre du document. Une liste vide veut dire « afficher le nom du
 * créneau ».
 *
 * Ce qui n'a ni créneau à son nom ni créneau général ce jour-là n'est dans
 * aucune liste : c'est à l'appelant de vérifier, sur la semaine, que la
 * notion paraît un autre jour, ou de la mettre à placer.
 *
 * LE CRÉNEAU PARTAGÉ (« EMC / Poésie »), réponse de Cécile du 18/10/2026 :
 * « il y a les semaines où on découvre la poésie, les autres lundis c'est de
 * l'EMC ». Un poème s'apprend sur plusieurs semaines, et sa ligne revient à
 * l'identique dans chacune. Donc, dans un créneau partagé alimenté par une
 * progression (l'EMC), la notion d'une AUTRE progression (la poésie des arts)
 * n'entre que la semaine où elle est nouvelle, et elle y entre seule : les
 * notions de la progression du créneau lui laissent la place, et vont dans
 * leurs autres créneaux (le vendredi « EMC ») ou à placer. Les autres
 * semaines, le créneau montre les siennes. `nouvelles[k][r]` dit si la notion
 * n'était pas dans la semaine précédente ; sans cette information, toutes
 * sont nouvelles.
 *
 * LE CARNET DE RANGEMENT (18/10/2026) passe en premier : une notion pour
 * laquelle `casesDeRegle` répond va dans ces cases et nulle part ailleurs,
 * même dans un créneau fermé aux notions ; elle ne se place ni par son nom, ni
 * dans le créneau général. Sans `casesDeRegle`, rien ne change.
 */
export function placerNotionsDuJour(
  creneaux: CreneauNotions[],
  notions: string[][],
  nouvelles: boolean[][] = notions.map(liste => liste.map(() => true)),
  casesDeRegle?: CasesDeRegle,
): { parCreneau: NotionPlacee[][]; continuees: NotionPlacee[] } {
  // Le carnet d'abord : les cases de la règle de chaque notion, s'il y en a une.
  const regle = notions.map((liste, k) => liste.map((_, r) => casesDeRegle?.(k, r)))
  // Les notions d'une autre matière qu'un créneau partagé a écartées parce
  // qu'elles continuent (le poème déjà montré la semaine où il a commencé) :
  // l'appelant ne les met pas à placer chaque semaine.
  const continuees: NotionPlacee[] = []
  const parLeNom = (cr: CreneauNotions): boolean[][] => {
    // Une notion du carnet ne se place jamais par son nom.
    const brut = notions.map((liste, k) => liste.map((n, r) => !regle[k][r] && cr.ouvert && creneauNommePour(cr.nom, n)))
    if (!estCreneauPartage(cr.nom)) return brut
    // Sans progression (pas de ligne d'EMC cette semaine-là), tout ce qu'il
    // nomme est « d'une autre matière » : le poème n'entre que s'il est nouveau.
    const autre = (k: number) => cr.progression === null || k !== cr.progression
    const decouverte = brut.some((liste, k) => autre(k) && liste.some((oui, r) => oui && nouvelles[k][r]))
    brut.forEach((liste, k) => liste.forEach((oui, r) => {
      if (oui && autre(k) && !nouvelles[k][r]) continuees.push({ progression: k, rang: r })
    }))
    return brut.map((liste, k) => liste.map((oui, r) =>
      oui && (autre(k) ? nouvelles[k][r] : !decouverte)))
  }
  const nommePour = creneaux.map((cr, i) => parLeNom(cr).map((liste, k) =>
    liste.map((oui, r) => (regle[k][r] ? regle[k][r]!.has(i) : oui))))
  const aSonCreneau = notions.map((liste, k) =>
    liste.map((_, r) => nommePour.some(parProgression => parProgression[k][r])))

  const parCreneau = creneaux.map((cr, i) => {
    const ordre = cr.progression === null
      ? notions.map((_, k) => k)
      : [cr.progression, ...notions.map((_, k) => k).filter(k => k !== cr.progression)]
    return ordre.flatMap(k => notions[k].flatMap((_, rang): NotionPlacee[] => {
      if (regle[k][rang]) return nommePour[i][k][rang] ? [{ progression: k, rang }] : []
      if (!cr.ouvert) return []
      const general = cr.general && cr.progression === k && !aSonCreneau[k][rang]
      return nommePour[i][k][rang] || general ? [{ progression: k, rang }] : []
    }))
  })
  return { parCreneau, continuees }
}
