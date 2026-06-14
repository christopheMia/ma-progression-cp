import Link from 'next/link'
import { Semaine } from '@/types'
import { getStatus, type Status } from '@/lib/semaines'

const statusStyles: Record<Status, string> = {
  done: 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300',
  current: 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-200 text-slate-900',
  upcoming: 'bg-white border-slate-200 text-slate-600 hover:border-rose-300',
}

export default function WeekCard({
  semaine,
  acquiredCount = 0,
  elevesCount = 0,
}: {
  semaine: Semaine
  acquiredCount?: number
  elevesCount?: number
}) {
  const status = getStatus(semaine)
  const total = semaine.graphemes.length * elevesCount
  const pct = total > 0 ? Math.round((acquiredCount / total) * 100) : 0
  const complete = total > 0 && acquiredCount >= total

  return (
    <Link href={`/semaine/${semaine.id}`}>
      <div className={`border rounded-xl p-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${statusStyles[status]}`}>
        <div className="flex justify-between items-start mb-1">
          <span className="font-bold text-sm">S{semaine.numero}</span>
          {complete && <span title="Semaine complète" className="text-xs">🏆</span>}
          {!complete && status === 'done' && <span className="text-emerald-500 text-xs">✓</span>}
          {!complete && status === 'current' && <span className="text-rose-600 text-xs font-bold">▶</span>}
        </div>
        <div className="text-xs font-medium min-h-[1rem]">{semaine.graphemes.join(', ')}</div>
        <div className="text-xs text-gray-500 mt-1 truncate">🌍 {semaine.edm_theme}</div>
        {total > 0 && (
          <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${complete ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </Link>
  )
}
