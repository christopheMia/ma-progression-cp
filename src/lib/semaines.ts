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
