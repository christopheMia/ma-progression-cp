import { Semaine } from '@/types'
import WeekCard from './WeekCard'

const PERIODES = [
  { nom: 'Période 1 — Septembre / Octobre', debut: 1, fin: 7 },
  { nom: 'Période 2 — Novembre / Décembre', debut: 8, fin: 14 },
  { nom: 'Période 3 — Janvier / Février', debut: 15, fin: 21 },
  { nom: 'Période 4 — Mars / Avril', debut: 22, fin: 28 },
  { nom: 'Période 5 — Mai / Juin', debut: 29, fin: 36 },
]

export default function AnnualGrid({ semaines }: { semaines: Semaine[] }) {
  return (
    <div className="space-y-6">
      {PERIODES.map(periode => (
        <div key={periode.nom} className="print-section">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            {periode.nom}
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-7 print:grid-cols-7 gap-2">
            {semaines
              .filter(s => s.numero >= periode.debut && s.numero <= periode.fin)
              .map(s => <WeekCard key={s.id} semaine={s} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
