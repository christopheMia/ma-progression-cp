'use client'
import { useState, useTransition } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { reinitialiserConfiguration } from '@/lib/actions/parametres'
import Bouton from '@/components/ui/Bouton'

export default function ResetButton() {
  const [confirmed, setConfirmed] = useState(false)
  const [isPending, startTransition] = useTransition()

  function reset() {
    startTransition(async () => {
      await reinitialiserConfiguration()
    })
  }

  if (!confirmed) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Efface toute la configuration (manuel, date, élèves, emploi du temps, suivi et cahiers journaux)
          et recommence l&apos;assistant de configuration depuis le début.
        </p>
        <Bouton variant="contour" size="sm" icon={Trash2} onClick={() => setConfirmed(true)}
          className="text-red-700 border-red-300 hover:bg-red-50 hover:border-red-400 focus-visible:ring-red-300/60">
          Repartir de zéro
        </Bouton>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex items-start gap-2">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
        <span><strong>Êtes-vous sûr ?</strong> Cette action est <strong>définitive</strong> :
          toute la classe et toutes ses données seront supprimées.</span>
      </div>
      <div className="flex gap-2">
        <Bouton variant="danger" onClick={reset} loading={isPending}>
          Oui, tout effacer et recommencer
        </Bouton>
        <Bouton variant="fantome" onClick={() => setConfirmed(false)} disabled={isPending}>
          Annuler
        </Bouton>
      </div>
    </div>
  )
}
