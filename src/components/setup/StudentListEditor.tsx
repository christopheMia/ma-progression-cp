'use client'
import { useState } from 'react'

export default function StudentListEditor({ onSelect }: { onSelect: (eleves: string[]) => void }) {
  const [input, setInput] = useState('')
  const [eleves, setEleves] = useState<string[]>([])

  function ajouterEleve() {
    const prenom = input.trim()
    if (prenom && !eleves.includes(prenom)) {
      setEleves(e => [...e, prenom])
      setInput('')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-600">Entrez les prénoms de vos élèves.</p>
      <p className="text-xs text-gray-400">Un prénom à la fois : tapez puis appuyez sur Entrée (ou « Ajouter »).</p>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ajouterEleve()}
          placeholder="Prénom de l'élève"
          className="flex-1 border-2 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 outline-none text-gray-900 bg-white" />
        <button onClick={ajouterEleve}
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
      </div>
      {eleves.length > 0 ? (
        <button onClick={() => onSelect(eleves)}
          className="w-full bg-violet-700 text-white rounded-xl p-4 font-semibold hover:bg-violet-800">
          Continuer avec {eleves.length} élève{eleves.length > 1 ? 's' : ''} →
        </button>
      ) : (
        <button onClick={() => onSelect([])}
          className="w-full border-2 border-violet-300 text-violet-700 rounded-xl p-4 font-semibold hover:bg-violet-50">
          Je les ajouterai plus tard →
        </button>
      )}
      <p className="text-xs text-gray-400 text-center">
        Pas encore la liste ? Commencez sans, vous les ajouterez dans <strong>Paramètres → Élèves</strong> (le suivi est conservé).
      </p>
    </div>
  )
}
