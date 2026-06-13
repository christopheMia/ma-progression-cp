import { Semaine } from '@/types'

export default function EdmBlock({ semaine }: { semaine: Semaine }) {
  return (
    <div className="bg-white border rounded-2xl p-5 space-y-2">
      <h2 className="font-bold text-gray-700">🌍 Explorer le monde</h2>
      <p className="text-lg font-semibold text-green-700">{semaine.edm_theme}</p>
      <p className="text-sm text-gray-600">{semaine.edm_competences}</p>
      <p className="text-xs text-gray-400">Programmes 2025/2026 — Cycle 2 CP</p>
    </div>
  )
}
