import { contient, mots } from '@/lib/familles-seances'
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
 * créneau est nommé pour une notion quand son nom ÉCRIT ce domaine en entier,
 * mots entiers, sans accents et sans la marque du pluriel (`mots`, la même
 * comparaison que `familles-seances.ts`) : « problème » écrit « Problèmes »,
 * « Histoire, géographie, sciences et technologie » écrit « Histoire »,
 * « Géographie » et « Sciences ». « Calcul » n'écrit pas « Calcul mental », et
 * « mathématiques » n'écrit pas « Numération ». Une barre oblique sépare des
 * domaines : « EMC/EVARS/PHARE » est nommé par « EMC ». Rien n'est deviné à
 * partir du sens d'un mot, seulement de ce que l'enseignante a tapé.
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
 * pas une notion d'arts nommée « Écriture »).
 */

/** Les domaines d'une notion, tels qu'écrits : « EMC/EVARS/PHARE » en donne trois. */
export function domainesNotion(notion: string): string[] {
  return domaineDe(notion).split('/').map(d => d.trim()).filter(d => /[a-z]/.test(mots(d)))
}

/** Vrai quand le nom du créneau écrit, en entier, l'un des domaines de la notion. */
export function creneauNommePour(nomCreneau: string, notion: string): boolean {
  const nom = mots(nomCreneau)
  return domainesNotion(notion).some(d => contient(nom, mots(d)))
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
 */
export function placerNotionsDuJour(creneaux: CreneauNotions[], notions: string[][]): NotionPlacee[][] {
  const nommePour = creneaux.map(cr => notions.map(liste =>
    liste.map(n => cr.ouvert && creneauNommePour(cr.nom, n))))
  const aSonCreneau = notions.map((liste, k) =>
    liste.map((_, r) => nommePour.some(parProgression => parProgression[k][r])))

  return creneaux.map((cr, i) => {
    if (!cr.ouvert) return []
    const ordre = cr.progression === null
      ? notions.map((_, k) => k)
      : [cr.progression, ...notions.map((_, k) => k).filter(k => k !== cr.progression)]
    return ordre.flatMap(k => notions[k].flatMap((_, rang): NotionPlacee[] => {
      const general = cr.general && cr.progression === k && !aSonCreneau[k][rang]
      return nommePour[i][k][rang] || general ? [{ progression: k, rang }] : []
    }))
  })
}
