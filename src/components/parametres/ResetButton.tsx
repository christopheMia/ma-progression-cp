'use client'
import { useState, useTransition } from 'react'
import { reinitialiserConfiguration } from '@/lib/actions/parametres'

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
        <p className="text-sm text-gray-600">
          Efface toute la configuration (manuel, date, élèves, emploi du temps, suivi et cahiers journaux)
          et recommence l&apos;assistant de configuration depuis le début.
        </p>
        <button onClick={() => setConfirmed(true)}
          className="text-sm border border-red-300 text-red-700 rounded-lg px-4 py-2 hover:bg-red-50">
          🗑️ Repartir de zéro
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
        ⚠️ <strong>Êtes-vous sûr ?</strong> Cette action est <strong>définitive</strong> :
        toute la classe et toutes ses données seront supprimées.
      </div>
      {isPending ? (
        <p className="text-sm text-red-700">Réinitialisation…</p>
      ) : (
        <div className="flex gap-2">
          <button onClick={reset}
            className="bg-red-600 text-white rounded-lg px-4 py-2 font-semibold hover:bg-red-700">
            Oui, tout effacer et recommencer
          </button>
          <button onClick={() => setConfirmed(false)}
            className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-50">
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}
