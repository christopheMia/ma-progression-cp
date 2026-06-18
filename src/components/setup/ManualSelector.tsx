'use client'
import IaImport from './IaImport'
import type { ProgressionSemaine } from '@/data/manuels'

export default function ManualSelector({
  onSelect,
  prenom,
}: {
  onSelect: (id: string, customProgression?: ProgressionSemaine[]) => void
  prenom?: string
}) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        Importe ta méthode de lecture : l&apos;IA la lit et construit ta progression, que tu pourras corriger ensuite.
      </p>
      <div className="border-2 border-violet-200 rounded-xl p-4 bg-violet-50">
        <IaImport prenom={prenom} matiereFixe="francais" onSelect={(id, prog) => onSelect(id, prog)} />
      </div>
    </div>
  )
}
