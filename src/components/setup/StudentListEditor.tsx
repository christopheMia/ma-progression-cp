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
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ajouterEleve()}
          placeholder="Prénom de l'élève"
          className="flex-1 border-2 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white" />
        <button onClick={ajouterEleve}
          className="bg-blue-600 text-white rounded-xl px-4 font-semibold hover:bg-blue-700">
          Ajouter
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {eleves.map((e, i) => (
          <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2">
            {e}
            <button onClick={() => setEleves(ev => ev.filter((_, j) => j !== i))}
              className="text-blue-400 hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      {eleves.length > 0 && (
        <button onClick={() => onSelect(eleves)}
          className="w-full bg-blue-700 text-white rounded-xl p-4 font-semibold hover:bg-blue-800">
          Continuer avec {eleves.length} élève{eleves.length > 1 ? 's' : ''} →
        </button>
      )}
    </div>
  )
}
