'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import ManualSelector from '@/components/setup/ManualSelector'
import { updateManuel } from '@/lib/actions/parametres'
import type { ProgressionSemaine } from '@/data/manuels'

export default function ManuelEditor({ currentNom, prenom }: { currentNom: string; prenom?: string }) {
  const [editing, setEditing] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function changer(manuelId: string, customProgression?: ProgressionSemaine[]) {
    startTransition(async () => {
      await updateManuel(manuelId, customProgression)
      setEditing(false)
      setConfirmed(false)
      router.push('/planning')
      router.refresh()
    })
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <p className="text-gray-700">Manuel actuel : <span className="font-semibold">{currentNom}</span></p>
        <button onClick={() => setEditing(true)}
          className="text-sm border border-violet-300 text-violet-700 rounded-lg px-4 py-2 hover:bg-violet-50">
          Changer de manuel
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        ⚠️ <strong>Attention</strong> : changer de manuel régénère toute la progression annuelle.
        Le suivi des élèves et les cahiers journaux déjà remplis seront <strong>définitivement effacés</strong>.
      </div>

      {!confirmed ? (
        <div className="flex gap-2">
          <button onClick={() => setConfirmed(true)}
            className="bg-red-600 text-white rounded-lg px-4 py-2 font-semibold hover:bg-red-700">
            J'ai compris, choisir un nouveau manuel
          </button>
          <button onClick={() => setEditing(false)}
            className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-50">
            Annuler
          </button>
        </div>
      ) : isPending ? (
        <p className="text-sm text-violet-700">Régénération de la progression…</p>
      ) : (
        <>
          <ManualSelector onSelect={changer} prenom={prenom} />
          <button onClick={() => { setConfirmed(false); setEditing(false) }}
            className="text-sm text-gray-500 hover:text-gray-700">
            ← Annuler
          </button>
        </>
      )}
    </div>
  )
}
