import { Semaine } from '@/types'
import WeekCard from './WeekCard'

export type PeriodePlanning = {
  numero: number
  nom: string
  date_debut: string
  date_fin: string
  ordre: number
}

const COULEURS_PERIODES = [
  'bg-violet-400', 'bg-orange-400', 'bg-emerald-400', 'bg-sky-400', 'bg-fuchsia-400',
]

// Repli pour les classes creees avant l'ajout du calendrier scolaire. Il ne
// s'applique que tant qu'aucune semaine n'a de `periode_numero` en base.
const PERIODES_HISTORIQUES = [
  { numero: 1, nom: 'Période 1 - Septembre / Octobre', debut: 1, fin: 7 },
  { numero: 2, nom: 'Période 2 - Novembre / Décembre', debut: 8, fin: 14 },
  { numero: 3, nom: 'Période 3 - Janvier / Février', debut: 15, fin: 21 },
  { numero: 4, nom: 'Période 4 - Mars / Avril', debut: 22, fin: 28 },
  { numero: 5, nom: 'Période 5 - Mai / Juin', debut: 29, fin: 36 },
]

export default function AnnualGrid({
  semaines,
  periodes = [],
  acquisParSemaine = {},
  elevesCount = 0,
}: {
  semaines: Semaine[]
  periodes?: PeriodePlanning[]
  acquisParSemaine?: Record<string, number>
  elevesCount?: number
}) {
  const utilisePeriodesReelles = periodes.length > 0
    && semaines.some(s => s.periode_numero != null)

  const groupes = utilisePeriodesReelles
    ? [...periodes]
        .sort((a, b) => a.ordre - b.ordre || a.numero - b.numero)
        .map(p => ({
          numero: p.numero,
          nom: p.nom,
          semaines: semaines.filter(s => s.periode_numero === p.numero),
        }))
    : PERIODES_HISTORIQUES.map(p => ({
        numero: p.numero,
        nom: p.nom,
        semaines: semaines.filter(s => s.numero >= p.debut && s.numero <= p.fin),
      }))

  const numerosAffectes = new Set(groupes.flatMap(g => g.semaines.map(s => s.numero)))
  const sansPeriode = utilisePeriodesReelles
    ? semaines.filter(s => !numerosAffectes.has(s.numero))
    : []
  if (sansPeriode.length) {
    groupes.push({ numero: 0, nom: 'Semaines à rattacher', semaines: sansPeriode })
  }

  return (
    <div className="space-y-6">
      {groupes.map(groupe => (
        <div key={`${groupe.numero}-${groupe.nom}`} className="print-section">
          <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${
              groupe.numero > 0 ? COULEURS_PERIODES[(groupe.numero - 1) % COULEURS_PERIODES.length] : 'bg-slate-400'
            }`} />
            {groupe.nom}
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-7 print:grid-cols-7 gap-2">
            {groupe.semaines.map(s => (
                <WeekCard
                  key={s.id}
                  semaine={s}
                  acquiredCount={acquisParSemaine[s.id] ?? 0}
                  elevesCount={elevesCount}
                />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
