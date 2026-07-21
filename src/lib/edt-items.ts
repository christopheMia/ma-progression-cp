// src/lib/edt-items.ts
//
// Remplit les ENVELOPPES de l'emploi du temps avec les items du manuel.
//
// MODELE VALIDE PAR CHRISTOPHE (21/07/2026) :
// les quotas donnent le budget par matiere, le generateur pose des enveloppes
// (au plus 2 h de la meme matiere), et DANS une enveloppe on cale plusieurs
// items du manuel. Une plage de 2 h de francais n'est pas une seance de 2 h :
// c'est phonologie, puis ateliers, puis etude de la langue.
//
// Sans cette etape, le generateur produit des blocs monolithiques de 1 h 15 ou
// 1 h 30 que l'emploi du temps reel de Cecile ne contient nulle part : chez
// elle, aucun bloc ne depasse 30 min.
//
// Quand une matiere n'a pas de manuel importe (anglais, EPS, arts), on laisse
// l'enveloppe telle quelle : Cecile ajustera a la main. Decision de Christophe.

import { familleMatiere, type Famille } from '@/data/trame-edt'
import type { CreneauTrame } from '@/data/trame-edt'

/** Pas de temps : tout reste cale sur le quart d'heure. */
const PAS = 15
/** En dessous, une sous-seance n'a plus de sens en CP. */
const DUREE_MIN_ITEM = 15

const enMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const enHeure = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/**
 * Decoupe une duree en `n` parts calees sur le quart d'heure, la somme
 * retombant EXACTEMENT sur la duree de depart. Le reste va aux premieres
 * parts : en CP on attaque par le plus exigeant.
 */
export function decouper(duree: number, n: number): number[] {
  if (n <= 1) return [duree]
  const unites = Math.floor(duree / PAS)
  if (unites < n) return [duree] // pas assez de place pour couper proprement
  const base = Math.floor(unites / n)
  const reste = unites % n
  return Array.from({ length: n }, (_, i) => (base + (i < reste ? 1 : 0)) * PAS)
}

/**
 * Nombre d'items qu'une enveloppe peut accueillir sans descendre sous le
 * plancher. Une plage de 45 min ne recevra jamais 4 items.
 */
export function capacite(duree: number): number {
  return Math.max(1, Math.floor(duree / DUREE_MIN_ITEM))
}

export type ItemsParFamille = Partial<Record<Famille, string[]>>

/**
 * Remplace chaque enveloppe par la suite des items qui lui reviennent.
 *
 * Les items d'une famille sont distribues sur ses enveloppes DANS L'ORDRE de
 * la semaine, proportionnellement a leur duree : une enveloppe deux fois plus
 * longue recoit deux fois plus d'items. Une enveloppe sans item disponible
 * garde son libelle de matiere.
 */
export function remplirEnveloppes(
  creneaux: CreneauTrame[],
  itemsParFamille: ItemsParFamille,
): CreneauTrame[] {
  // Enveloppes eligibles, par famille, dans l'ordre de la grille.
  const parFamille = new Map<Famille, number[]>()
  creneaux.forEach((c, i) => {
    if (c.type === 'routine') return
    const f = familleMatiere(c.matiere)
    if (!f) return
    if (!itemsParFamille[f]?.length) return
    parFamille.set(f, [...(parFamille.get(f) ?? []), i])
  })

  const sortie: CreneauTrame[] = []
  const remplace = new Map<number, CreneauTrame[]>()

  for (const [famille, indices] of parFamille) {
    const items = [...(itemsParFamille[famille] ?? [])]
    if (!items.length) continue

    // Combien d'items par enveloppe : au prorata de la duree, borne par la
    // capacite reelle de la plage, et jamais plus qu'il n'en reste.
    const durees = indices.map(i => enMinutes(creneaux[i].heure_fin) - enMinutes(creneaux[i].heure_debut))
    const total = durees.reduce((s, d) => s + d, 0)

    let restants = items.length
    const parts = durees.map((d, k) => {
      if (k === durees.length - 1) return Math.min(restants, capacite(d))
      const ideal = Math.round((d / total) * items.length)
      const n = Math.max(1, Math.min(ideal, capacite(d), restants - (durees.length - 1 - k)))
      restants -= n
      return n
    })

    let curseurItem = 0
    indices.forEach((i, k) => {
      const c = creneaux[i]
      const n = Math.max(0, parts[k])
      if (n <= 0) return
      const lot = items.slice(curseurItem, curseurItem + n)
      curseurItem += n
      if (!lot.length) return

      const debut = enMinutes(c.heure_debut)
      const duree = enMinutes(c.heure_fin) - debut
      const tranches = decouper(duree, lot.length)

      let curseur = debut
      const morceaux: CreneauTrame[] = lot.map((item, j) => {
        const bloc: CreneauTrame = {
          ...c,
          heure_debut: enHeure(curseur),
          heure_fin: enHeure(curseur + tranches[j]),
          matiere: item,
        }
        curseur += tranches[j]
        return bloc
      })
      remplace.set(i, morceaux)
    })
  }

  creneaux.forEach((c, i) => {
    const morceaux = remplace.get(i)
    if (morceaux) sortie.push(...morceaux)
    else sortie.push(c)
  })

  return sortie.map((c, i) => ({ ...c, ordre: i }))
}
