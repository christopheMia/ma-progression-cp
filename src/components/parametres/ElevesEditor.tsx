'use client'
import { useState, useTransition } from 'react'
import { updateEleves } from '@/lib/actions/parametres'

export default function ElevesEditor({ initial }: { initial: string[] }) {
  const [eleves, setEleves] = useState<string[]>(initial)
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function ajouter() {
    const prenom = input.trim()
    if (prenom && !eleves.includes(prenom)) {
      setEleves(e => [...e, prenom])
      setInput('')
    }
  }

  function enregistrer() {
    setSaved(false)
    startTransition(async () => {
      await updateEleves(eleves)
      setSaved(true)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), ajouter())}
          placeholder="Prénom de l'élève"
          className="flex-1 border-2 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 outline-none text-gray-900 bg-white" />
        <button onClick={ajouter}
          className="bg-violet-600 text-white rounded-xl px-4 font-semibold hover:bg-violet-700">
          Ajouter
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {eleves.map((e, i) => (
          <span key={i} className="bg-violet-100 text-violet-800 px-3 py-1 rounded-full flex items-center gap-2">
            {e}
            <button onClick={() => setEleves(ev => ev.filter((_, j) => j !== i))}
              className="text-violet-400 hover:text-red-500">×</button>
          </span>
        ))}
        {eleves.length === 0 && <span className="text-sm text-gray-400">Aucun élève.</span>}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={enregistrer} disabled={isPending}
          className="bg-violet-700 text-white rounded-lg px-4 py-2 font-semibold hover:bg-violet-800 disabled:opacity-50">
          {isPending ? 'Enregistrement...' : 'Enregistrer les élèves'}
        </button>
        {saved && !isPending && <span className="text-sm text-green-600">✓ Enregistré</span>}
      </div>
      <p className="text-xs text-gray-400">
        Le suivi des élèves conservés est préservé. Supprimer un élève efface son suivi.
      </p>
    </div>
  )
}
