import Link from 'next/link'
import { Semaine } from '@/types'

type Status = 'done' | 'current' | 'upcoming'

function getStatus(semaine: Semaine): Status {
  const today = new Date()
  const debut = new Date(semaine.date_debut)
  const fin = new Date(debut)
  fin.setDate(fin.getDate() + 4)
  if (fin < today) return 'done'
  if (debut <= today) return 'current'
  return 'upcoming'
}

const statusStyles: Record<Status, string> = {
  done: 'bg-green-50 border-green-300 text-green-800',
  current: 'bg-blue-50 border-blue-500 border-2 shadow-md',
  upcoming: 'bg-white border-gray-200 text-gray-600',
}

export default function WeekCard({ semaine }: { semaine: Semaine }) {
  const status = getStatus(semaine)
  return (
    <Link href={`/semaine/${semaine.id}`}>
      <div className={`border rounded-xl p-3 cursor-pointer hover:shadow transition-shadow ${statusStyles[status]}`}>
        <div className="flex justify-between items-start mb-1">
          <span className="font-bold text-sm">S{semaine.numero}</span>
          {status === 'done' && <span className="text-green-600 text-xs">✓</span>}
          {status === 'current' && <span className="text-blue-600 text-xs font-bold">▶</span>}
        </div>
        <div className="text-xs font-medium">{semaine.graphemes.join(', ')}</div>
        <div className="text-xs text-gray-500 mt-1 truncate">🌍 {semaine.edm_theme}</div>
      </div>
    </Link>
  )
}
