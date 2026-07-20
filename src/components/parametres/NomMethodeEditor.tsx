'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { renommerMethode } from '@/lib/actions/methodes'

/**
 * Nom du manuel d'une methode, modifiable sur place.
 *
 * Les methodes importees avant l'ajout du champ n'ont pas de nom en base :
 * sans ce petit editeur, il aurait fallu tout reimporter juste pour afficher
 * "Taoki" a cote de "Francais".
 */
export default function NomMethodeEditor({ methodeId, nom }: {
  methodeId: string
  nom: string | null
}) {
  const [edition, setEdition] = useState(false)
  const [valeur, setValeur] = useState(nom ?? '')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function enregistrer() {
    startTransition(async () => {
      await renommerMethode(methodeId, valeur)
      setEdition(false)
      router.refresh()
    })
  }

  function annuler() {
    setValeur(nom ?? '')
    setEdition(false)
  }

  if (!edition) {
    return (
      <button type="button" onClick={() => setEdition(true)}
        title="Modifier le nom du manuel"
        className={`text-xs rounded-full px-2 py-0.5 border transition-colors ${
          nom
            ? 'font-medium text-slate-700 bg-slate-100 border-slate-300 hover:bg-slate-200'
            : 'text-violet-700 bg-violet-50 border-violet-300 border-dashed hover:bg-violet-100'
        }`}>
        {nom ? `📕 ${nom}` : '📕 Nommer le manuel'}
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        value={valeur}
        onChange={e => setValeur(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') enregistrer()
          if (e.key === 'Escape') annuler()
        }}
        autoFocus
        disabled={isPending}
        placeholder="Ex : Taoki, Pilotis…"
        className="w-44 border-2 border-slate-300 rounded-lg px-2 py-1 text-xs text-gray-900 bg-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
      />
      <button type="button" onClick={enregistrer} disabled={isPending}
        className="text-xs bg-violet-600 text-white rounded-lg px-2 py-1 disabled:opacity-50">
        {isPending ? '…' : 'OK'}
      </button>
      <button type="button" onClick={annuler} disabled={isPending}
        className="text-xs border border-slate-300 text-slate-600 rounded-lg px-2 py-1 hover:bg-slate-50">
        Annuler
      </button>
    </span>
  )
}
