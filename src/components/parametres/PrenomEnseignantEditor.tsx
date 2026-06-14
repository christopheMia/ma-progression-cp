'use client'
import { useState, useTransition } from 'react'
import { updatePrenomEnseignant } from '@/lib/actions/parametres'

export default function PrenomEnseignantEditor({ initial }: { initial: string }) {
  const [prenom, setPrenom] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function enregistrer() {
    setSaved(false)
    startTransition(async () => {
      await updatePrenomEnseignant(prenom)
      setSaved(true)
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">
        Utilisé pour vous accueillir (« Bonjour {prenom.trim() || 'Cécile'} ») et personnaliser l&apos;assistant IA.
      </p>
      <div className="flex items-center gap-2">
        <input
          value={prenom}
          onChange={e => setPrenom(e.target.value)}
          placeholder="Votre prénom"
          className="border border-gray-200 rounded-lg p-2 text-sm text-gray-900 bg-white focus:ring-1 focus:ring-violet-400 outline-none" />
        <button onClick={enregistrer} disabled={isPending}
          className="bg-violet-700 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-violet-800 disabled:opacity-50">
          {isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {saved && !isPending && <span className="text-sm text-green-600">✓ Enregistré</span>}
      </div>
    </div>
  )
}
