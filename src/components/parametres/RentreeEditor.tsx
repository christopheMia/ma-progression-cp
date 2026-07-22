'use client'
import { useState, useTransition } from 'react'
import { updateRentreeDate } from '@/lib/actions/parametres'
import type { ZoneScolaire } from '@/lib/calendrier-officiel'

export default function RentreeEditor({ initial, initialZone = 'A' }: { initial: string; initialZone?: ZoneScolaire }) {
  const [date, setDate] = useState(initial)
  const [zone, setZone] = useState<ZoneScolaire>(initialZone)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function enregistrer() {
    setSaved(false)
    startTransition(async () => {
      await updateRentreeDate(date, zone)
      setSaved(true)
    })
  }

  return (
    <div className="space-y-3">
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        className="w-full border-2 rounded-xl p-3 text-lg focus:ring-2 focus:ring-violet-500 outline-none text-gray-900 bg-white" />
      <div>
        <label htmlFor="zone-scolaire-parametres" className="mb-1 block text-sm font-medium text-gray-700">
          Zone scolaire
        </label>
        <select id="zone-scolaire-parametres" value={zone}
          onChange={e => setZone(e.target.value as ZoneScolaire)}
          className="w-full rounded-xl border-2 bg-white p-3 text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
          <option value="A">Zone A</option>
          <option value="B">Zone B</option>
          <option value="C">Zone C</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={enregistrer} disabled={isPending}
          className="bg-violet-700 text-white rounded-lg px-4 py-2 font-semibold hover:bg-violet-800 disabled:opacity-50">
          {isPending ? 'Recalcul...' : 'Enregistrer le calendrier'}
        </button>
        {saved && !isPending && <span className="text-sm text-green-600">✓ Dates recalculées</span>}
      </div>
      <p className="text-xs text-gray-400">
        Les périodes P1 à P5 et les 36 semaines sont recalculées. Le suivi des élèves et les cahiers journaux sont conservés.
      </p>
    </div>
  )
}
