import { Semaine } from '@/types'

export type Status = 'done' | 'current' | 'upcoming'

export function getStatus(semaine: Semaine, today = new Date()): Status {
  const debut = new Date(semaine.date_debut)
  const fin = new Date(debut)
  fin.setDate(fin.getDate() + 4)
  if (fin < today) return 'done'
  if (debut <= today) return 'current'
  return 'upcoming'
}

/** La semaine en cours, sinon la prochaine à venir, sinon la dernière. */
export function semaineEnCours(semaines: Semaine[]): Semaine | null {
  if (!semaines.length) return null
  const today = new Date()
  return (
    semaines.find(s => getStatus(s, today) === 'current') ??
    semaines.find(s => getStatus(s, today) === 'upcoming') ??
    semaines[semaines.length - 1]
  )
}

/** Libellé d’une semaine fondé uniquement sur un contenu réellement enregistré. */
export function libelleContenuSemaine(items: readonly string[]): string | null {
  const contenus = items.map(item => item.trim()).filter(Boolean)
  return contenus.length > 0 ? contenus.join(', ') : null
}
