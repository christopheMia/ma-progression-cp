import { Semaine } from '@/types'
import WeekCard from './WeekCard'

const PERIODES = [
  { nom: 'Période 1 — Septembre / Octobre', debut: 1, fin: 7, dot: 'bg-rose-400' },
  { nom: 'Période 2 — Novembre / Décembre', debut: 8, fin: 14, dot: 'bg-orange-400' },
  { nom: 'Période 3 — Janvier / Février', debut: 15, fin: 21, dot: 'bg-emerald-400' },
  { nom: 'Période 4 — Mars / Avril', debut: 22, fin: 28, dot: 'bg-sky-400' },
  { nom: 'Période 5 — Mai / Juin', debut: 29, fin: 36, dot: 'bg-violet-400' },
]

export default function AnnualGrid({
  semaines,
  acquisParSemaine = {},
  elevesCount = 0,
}: {
  semaines: Semaine[]
  acquisParSemaine?: Record<string, number>
  elevesCount?: number
}) {
  return (
    <div className="space-y-6">
      {PERIODES.map(periode => (
        <div key={periode.nom} className="print-section">
          <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${periode.dot}`} />
            {periode.nom}
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-7 print:grid-cols-7 gap-2">
            {semaines
              .filter(s => s.numero >= periode.debut && s.numero <= periode.fin)
              .map(s => (
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
