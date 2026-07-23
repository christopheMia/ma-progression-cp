'use client'
import { useState } from 'react'
import { ArrowRight, RefreshCw } from 'lucide-react'
import IaImport from './IaImport'
import Bouton from '@/components/ui/Bouton'
import type { ProgressionSemaine } from '@/data/manuels'

export default function ManualSelector({
  onSelect,
  prenom,
  initial,
}: {
  onSelect: (id: string, customProgression?: ProgressionSemaine[]) => void
  prenom?: string
  /** Import deja effectue : permet de revenir a cette etape sans tout refaire. */
  initial?: { manuelId: string; progression?: ProgressionSemaine[] }
}) {
  // Si une methode a deja ete importee, on ne relance pas l'IA d'office :
  // l'enseignante peut simplement continuer, ou choisir de reimporter.
  const [reimport, setReimport] = useState(false)

  if (initial?.manuelId && !reimport) {
    const nbSemaines = initial.progression?.length ?? 0
    return (
      <div className="space-y-4">
        <div className="border-2 border-violet-200 rounded-xl p-4 bg-violet-50">
          <p className="font-semibold text-violet-900">✓ Méthode de lecture déjà importée</p>
          {nbSemaines > 0 && (
            <p className="text-sm text-violet-700 mt-1">
              {nbSemaines} semaine{nbSemaines > 1 ? 's' : ''} de progression prête{nbSemaines > 1 ? 's' : ''}.
            </p>
          )}
          <p className="text-sm text-gray-600 mt-1">Tu peux continuer, ou réimporter une autre méthode.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Bouton type="button" variant="principal" size="lg" iconRight={ArrowRight}
            className="flex-1" onClick={() => onSelect(initial.manuelId, initial.progression)}>
            Continuer
          </Bouton>
          <Bouton type="button" variant="contour" size="lg" icon={RefreshCw}
            className="flex-1" onClick={() => setReimport(true)}>
            Réimporter une méthode
          </Bouton>
        </div>
      </div>
    )
  }

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
