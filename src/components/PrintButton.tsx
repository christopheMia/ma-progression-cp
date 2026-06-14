'use client'
import { imprimerPage } from '@/lib/print'

export default function PrintButton({ label = '🖨️ Imprimer' }: { label?: string }) {
  return (
    <button
      onClick={imprimerPage}
      className="no-print text-sm border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-50">
      {label}
    </button>
  )
}
