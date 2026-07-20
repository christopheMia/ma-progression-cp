'use client'
import { useState, useTransition } from 'react'
import { realignerSemaines } from '@/lib/actions/parametres'

/** Réaligne les semaines sur le vrai calendrier (saute les vacances) pour que
 *  chaque période ait ses vraies semaines. Non destructif (suivi préservé).
 *  Confirmation en deux temps + rechargement complet. */
export default function RealignerSemainesButton() {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function run() {
    startTransition(async () => {
      await realignerSemaines()
      setConfirm(false)
      window.location.reload()
    })
  }

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="shrink-0 text-xs border border-violet-300 text-violet-700 rounded-lg px-2.5 py-1 hover:bg-violet-50">
        📅 Caler sur le calendrier
      </button>
    )
  }

  return (
    <span className="flex items-center gap-2 flex-wrap justify-end text-xs">
      <span className="text-violet-700">Recale les semaines sur les vraies dates (saute les vacances). Le suivi est conservé.</span>
      <button type="button" onClick={run} disabled={isPending}
        className="bg-violet-600 text-white rounded-lg px-2.5 py-1 disabled:opacity-50">
        {isPending ? 'Recalage…' : 'Oui, recaler'}
      </button>
      <button type="button" onClick={() => setConfirm(false)} disabled={isPending}
        className="border border-gray-300 text-gray-600 rounded-lg px-2.5 py-1 hover:bg-gray-50">
        Annuler
      </button>
    </span>
  )
}
