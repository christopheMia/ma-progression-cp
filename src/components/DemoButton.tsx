'use client'
import { useState, useTransition } from 'react'
import { chargerClasseDemo } from '@/lib/actions/demo'

export default function DemoButton({ confirmer = false }: { confirmer?: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [armed, setArmed] = useState(false)

  function lancer() {
    startTransition(async () => {
      await chargerClasseDemo()
    })
  }

  if (confirmer && !armed) {
    return (
      <button onClick={() => setArmed(true)}
        className="text-sm border border-violet-300 text-violet-700 rounded-lg px-4 py-2 hover:bg-violet-50">
        🎓 Charger une classe de démonstration
      </button>
    )
  }

  if (confirmer && armed) {
    return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          ⚠️ Cela <strong>remplace votre configuration actuelle</strong> par une classe de démonstration.
        </div>
        <div className="flex gap-2">
          <button onClick={lancer} disabled={isPending}
            className="bg-violet-600 text-white rounded-lg px-4 py-2 font-semibold hover:bg-violet-700 disabled:opacity-50">
            {isPending ? 'Chargement…' : 'Oui, charger la démo'}
          </button>
          <button onClick={() => setArmed(false)} disabled={isPending}
            className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-50">
            Annuler
          </button>
        </div>
      </div>
    )
  }

  return (
    <button onClick={lancer} disabled={isPending}
      className="text-sm border border-violet-300 text-violet-700 rounded-lg px-4 py-2 hover:bg-violet-50 disabled:opacity-50">
      {isPending ? 'Chargement…' : '🎓 Charger une classe de démonstration'}
    </button>
  )
}
