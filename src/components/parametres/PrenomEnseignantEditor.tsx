'use client'
import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { updatePrenomEnseignant } from '@/lib/actions/parametres'
import Bouton from '@/components/ui/Bouton'

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
        <Bouton variant="secondaire" size="sm" onClick={enregistrer} loading={isPending}>
          {isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Bouton>
        {saved && !isPending && <span className="text-sm text-emerald-600 inline-flex items-center gap-1"><Check size={15} aria-hidden="true" /> Enregistré</span>}
      </div>
    </div>
  )
}
