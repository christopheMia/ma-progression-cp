import type { SeanceProgression } from '@/types'

/**
 * Marqueur de jour en tête d'un item : « Jour 2 : Grammaire ».
 *
 * Ce fichier est le SEUL endroit qui connaît cette convention. Elle date de
 * l'époque où la table n'avait pas de colonne pour la journée : le jour ne
 * survivait que dans le texte. On la relit pour reprendre l'existant, et on la
 * réécrit pour que tout ce qui lit encore `items` continue de fonctionner.
 */
const PREFIXE_JOUR = /^\s*jours?\s*(\d+)\s*[:.\-–—]\s*/i

/**
 * Domaine = ce qui précède les deux points, quand c'est court.
 *
 * « LC : La petite poule » donne "LC". Une phrase entière suivie de deux points
 * n'est pas un domaine : au-delà de 30 caractères on renonce plutôt que de
 * couper une phrase au hasard.
 */
const MAX_DOMAINE = 30

function domaineDe(libelle: string): string {
  const coupe = libelle.indexOf(':')
  if (coupe < 1 || coupe > MAX_DOMAINE) return ''
  return libelle.slice(0, coupe).trim()
}

export function seancesDepuisItems(items: string[]): SeanceProgression[] {
  return items
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .map(item => {
      const trouve = item.match(PREFIXE_JOUR)
      const libelle = trouve ? item.replace(PREFIXE_JOUR, '').trim() : item
      const numero = trouve ? Number(trouve[1]) : NaN
      return {
        jour: Number.isInteger(numero) && numero > 0 ? numero : null,
        domaine: domaineDe(libelle),
        libelle,
      }
    })
}

export function itemsDepuisSeances(seances: SeanceProgression[]): string[] {
  return seances.map(s => (s.jour ? `Jour ${s.jour} : ${s.libelle}` : s.libelle))
}
