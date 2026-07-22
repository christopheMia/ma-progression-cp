'use client'
import { useState } from 'react'
import { rentreeOfficielleParDefaut, type ZoneScolaire } from '@/lib/calendrier-officiel'

export default function RentreeDatePicker({
  onSelect,
  initial,
  initialZone = 'A',
}: {
  onSelect: (date: string, zone: ZoneScolaire) => void
  initial?: string
  initialZone?: ZoneScolaire
}) {
  // On repart de la date deja saisie si l'enseignante revient en arriere,
  // sinon d'une rentree par defaut.
  const [zone, setZone] = useState<ZoneScolaire>(initialZone)
  const [date, setDate] = useState(initial || rentreeOfficielleParDefaut(initialZone))
  return (
    <div className="space-y-4">
      <p className="text-gray-600">Quel est le jour de ta rentrée ?</p>
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        className="w-full border-2 rounded-xl p-4 text-lg focus:ring-2 focus:ring-violet-500 outline-none text-gray-900 bg-white" />
      <div>
        <label htmlFor="zone-scolaire" className="mb-1 block text-sm font-medium text-gray-700">
          Ta zone scolaire
        </label>
        <select id="zone-scolaire" value={zone}
          onChange={e => setZone(e.target.value as ZoneScolaire)}
          className="w-full rounded-xl border-2 bg-white p-3 text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
          <option value="A">Zone A</option>
          <option value="B">Zone B</option>
          <option value="C">Zone C</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Elle sert uniquement à placer les vacances et les périodes P1 à P5.
        </p>
      </div>
      <button onClick={() => onSelect(date, zone)}
        className="w-full bg-violet-700 text-white rounded-xl p-4 font-semibold hover:bg-violet-800">
        Continuer →
      </button>
    </div>
  )
}
