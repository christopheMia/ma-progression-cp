// src/lib/calendrier-semaines.ts
//
// Réaligne les N semaines de classe sur le VRAI calendrier scolaire : chaque
// semaine tombe sur une semaine d'école réelle (lundi), en SAUTANT les semaines
// de vacances. Sans ça, 36 lundis consécutifs depuis la rentrée finissent début
// mai et la période 5 (fin avril → juillet) se retrouve quasi vide.
//
// Fonction pure, testable, sans effet de bord. Les dates de periode viennent de
// la table `periodes` (calendrier officiel, éditable).

import { addDays, startOfWeek, parseISO, format } from 'date-fns'

export type PeriodeBornes = { numero: number; date_debut: string; date_fin: string }

export type SemaineCalendaire = { numero: number; date_debut: string; periode_numero: number }

/**
 * Répartit `nbSemaines` semaines de classe sur les semaines d'école réelles
 * délimitées par `periodes`. Une semaine d'école = un lundi dont la plage
 * lundi→vendredi chevauche une période (donc hors vacances).
 *
 * Retourne, pour chaque semaine (numéro 1..nbSemaines effectivement placé), sa
 * date de début (lundi) et le numéro de période qui la contient.
 */
export function datesSemainesCalendaires(
  periodes: PeriodeBornes[],
  nbSemaines: number,
): SemaineCalendaire[] {
  const ps = [...periodes].sort((a, b) => a.numero - b.numero)
  if (ps.length === 0 || nbSemaines <= 0) return []

  const intervals = ps.map(p => ({
    numero: p.numero,
    start: parseISO(p.date_debut),
    end: parseISO(p.date_fin),
  }))
  const last = intervals[intervals.length - 1].end

  // Lundi de la semaine contenant le début de la 1re période.
  let monday = startOfWeek(intervals[0].start, { weekStartsOn: 1 })
  const out: SemaineCalendaire[] = []
  let n = 1

  while (monday.getTime() <= last.getTime() && n <= nbSemaines) {
    const friday = addDays(monday, 4)
    // Période dont l'intervalle chevauche la plage lundi→vendredi de cette semaine.
    const per = intervals.find(iv =>
      monday.getTime() <= iv.end.getTime() && friday.getTime() >= iv.start.getTime())
    if (per) {
      out.push({ numero: n, date_debut: format(monday, 'yyyy-MM-dd'), periode_numero: per.numero })
      n++
    }
    monday = addDays(monday, 7)
  }

  return out
}
