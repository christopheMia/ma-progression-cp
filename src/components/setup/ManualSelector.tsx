import { MANUELS } from '@/data/manuels'

export default function ManualSelector({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600">Quel manuel de lecture utilisez-vous cette année ?</p>
      <div className="grid gap-3">
        {MANUELS.map(manuel => (
          <button key={manuel.id} onClick={() => onSelect(manuel.id)}
            className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
            <div>
              <div className="font-semibold text-gray-800">{manuel.nom}</div>
              <div className="text-sm text-gray-500">{manuel.editeur}</div>
            </div>
            <span className="text-blue-500">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}
