'use client'
import { useState, useTransition } from 'react'
import { updateRentreeDate } from '@/lib/actions/parametres'

export default function RentreeEditor({ initial }: { initial: string }) {
  const [date, setDate] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function enregistrer() {
    setSaved(false)
    startTransition(async () => {
      await updateRentreeDate(date)
      setSaved(true)
    })
  }

  return (
    <div className="space-y-3">
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        className="w-full border-2 rounded-xl p-3 text-lg focus:ring-2 focus:ring-rose-500 outline-none text-gray-900 bg-white" />
      <div className="flex items-center gap-3">
        <button onClick={enregistrer} disabled={isPending}
          className="bg-rose-700 text-white rounded-lg px-4 py-2 font-semibold hover:bg-rose-800 disabled:opacity-50">
          {isPending ? 'Recalcul...' : 'Enregistrer la date'}
        </button>
        {saved && !isPending && <span className="text-sm text-green-600">✓ Dates recalculées</span>}
      </div>
      <p className="text-xs text-gray-400">
        Les dates des 36 semaines sont recalculées. Le suivi des élèves et les cahiers journaux sont conservés.
      </p>
    </div>
  )
}
