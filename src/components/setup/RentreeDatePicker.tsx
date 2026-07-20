'use client'
import { useState } from 'react'

export default function RentreeDatePicker({ onSelect }: { onSelect: (date: string) => void }) {
  const [date, setDate] = useState('2025-09-02')
  return (
    <div className="space-y-4">
      <p className="text-gray-600">Quel est le jour de ta rentrée ?</p>
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        className="w-full border-2 rounded-xl p-4 text-lg focus:ring-2 focus:ring-violet-500 outline-none text-gray-900 bg-white" />
      <button onClick={() => onSelect(date)}
        className="w-full bg-violet-700 text-white rounded-xl p-4 font-semibold hover:bg-violet-800">
        Continuer →
      </button>
    </div>
  )
}
