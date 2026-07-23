'use client'
import { useState } from 'react'
import { ArrowRight, Trash2, UserPlus } from 'lucide-react'
import { decouperPrenoms } from '@/lib/prenoms'
import Bouton from '@/components/ui/Bouton'

export default function StudentListEditor({ onSelect, initial }: { onSelect: (eleves: string[]) => void; initial?: string[] }) {
  const [input, setInput] = useState('')
  // Les prenoms deja saisis sont re-affiches si l'enseignante revient en arriere,
  // pour ne pas la forcer a tout recoller.
  const [eleves, setEleves] = useState<string[]>(initial ?? [])

  /**
   * Ajoute un OU PLUSIEURS prénoms d'un coup. On découpe sur les retours à la
   * ligne, virgules et points-virgules : on peut donc coller une liste entière
   * (un prénom par ligne) au lieu de les saisir un par un. Les doublons sont
   * ignorés (insensible à la casse), l'ordre de saisie est conservé.
   */
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

  // Coller une liste multi-lignes dans un champ simple : on intercepte pour
  // garder les séparations, qu'un <input> écraserait sinon en espaces.
  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const texte = e.clipboardData.getData('text')
    if (/[\n,;\t]/.test(texte)) {
      e.preventDefault()
      ajouter(texte)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        Tape un prénom puis Entrée, ou <strong>colle toute ta liste d’un coup</strong> :
        un prénom par ligne, ou séparés par des virgules.
      </p>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), ajouter(input))}
          onPaste={onPaste}
          placeholder="Un prénom, ou toute la liste collée"
          className="flex-1 border-2 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 outline-none text-gray-900 bg-white" />
        <Bouton type="button" size="lg" icon={UserPlus} onClick={() => ajouter(input)}>
          Ajouter
        </Bouton>
      </div>
      {eleves.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{eleves.length} élève{eleves.length > 1 ? 's' : ''}</span>
          <Bouton type="button" variant="fantome" size="sm" icon={Trash2}
            onClick={() => setEleves([])}>
            Tout effacer
          </Bouton>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {eleves.map((e, i) => (
          <span key={i} className="bg-violet-100 text-violet-800 px-3 py-1 rounded-full flex items-center gap-2">
            {e}
            <button onClick={() => setEleves(ev => ev.filter((_, j) => j !== i))}
              className="text-violet-400 hover:text-red-500" aria-label={`Retirer ${e}`}>×</button>
          </span>
        ))}
      </div>
      {eleves.length > 0 ? (
        <Bouton type="button" variant="principal" size="lg" iconRight={ArrowRight}
          className="w-full" onClick={() => onSelect(eleves)}>
          Continuer avec {eleves.length} élève{eleves.length > 1 ? 's' : ''}
        </Bouton>
      ) : (
        <Bouton type="button" variant="contour" size="lg" iconRight={ArrowRight}
          className="w-full" onClick={() => onSelect([])}>
          Je les ajouterai plus tard
        </Bouton>
      )}
      <p className="text-xs text-gray-400 text-center">
        Pas encore la liste ? Commence sans, tu les ajouteras dans <strong>Paramètres → Élèves</strong> (le suivi est conservé).
      </p>
    </div>
  )
}
