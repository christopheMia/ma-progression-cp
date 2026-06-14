'use client'
import { useState } from 'react'

export default function RentreeDatePicker({ onSelect }: { onSelect: (date: string) => void }) {
  const [date, setDate] = useState('2025-09-02')
  return (
    <div className="space-y-4">
      <p className="text-gray-600">Quelle est la date de votre rentrée ?</p>
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        className="w-full border-2 rounded-xl p-4 text-lg focus:ring-2 focus:ring-rose-500 outline-none text-gray-900 bg-white" />
      <p className="text-sm text-gray-400">L&apos;outil calculera automatiquement les 36 semaines de l&apos;année.</p>
      <button onClick={() => onSelect(date)}
        className="w-full bg-rose-700 text-white rounded-xl p-4 font-semibold hover:bg-rose-800">
        Continuer →
      </button>
    </div>
  )
}
