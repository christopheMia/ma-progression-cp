'use client'
import { useState, useTransition } from 'react'
import { updateEleves } from '@/lib/actions/parametres'
import { decouperPrenoms } from '@/lib/prenoms'

export default function ElevesEditor({ initial }: { initial: string[] }) {
  const [eleves, setEleves] = useState<string[]>(initial)
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  // Ajoute un ou PLUSIEURS prénoms : on peut coller toute la liste d'un coup
  // (un par ligne ou séparés par des virgules). Doublons ignorés (casse
  // insensible), ordre conservé.
  function ajouter(texte: string) {
    const nouveaux = decouperPrenoms(texte)
    if (!nouveaux.length) return
    setEleves(prev => {
      const vus = new Set(prev.map(p => p.toLowerCase()))
      const aAjouter: string[] = []
      for (const p of nouveaux) {
        if (!vus.has(p.toLowerCase())) { vus.add(p.toLowerCase()); aAjouter.push(p) }
      }
      return [...prev, ...aAjouter]
    })
    setInput('')
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const texte = e.clipboardData.getData('text')
    if (/[\n,;\t]/.test(texte)) {
      e.preventDefault()
      ajouter(texte)
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
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), ajouter(input))}
          onPaste={onPaste}
          placeholder="Un prénom, ou toute la liste collée"
          className="flex-1 border-2 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 outline-none text-gray-900 bg-white" />
        <button onClick={() => ajouter(input)}
          className="bg-violet-600 text-white rounded-xl px-4 font-semibold hover:bg-violet-700">
          Ajouter
        </button>
      </div>
      <p className="text-xs text-gray-400">Astuce : colle toute ta liste d’un coup, un prénom par ligne.</p>
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
