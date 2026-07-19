'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reinitialiserBloc } from '@/lib/actions/parametres'

type Scope = 'eleves' | 'edt' | 'methodes' | 'suivi' | 'journaux'

/** Petit bouton "remettre à zéro" pour un bloc des paramètres (nouvelle année),
 *  avec confirmation en deux temps pour éviter les accidents. */
export default function ResetBlockButton({ scope, message }: { scope: Scope; message: string }) {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function run() {
    startTransition(async () => {
      await reinitialiserBloc(scope)
      setConfirm(false)
      router.refresh()
    })
  }

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="shrink-0 text-xs border border-red-200 text-red-600 rounded-lg px-2.5 py-1 hover:bg-red-50">
        🧹 Remettre à zéro
      </button>
    )
  }

  return (
    <span className="flex items-center gap-2 flex-wrap justify-end text-xs">
      <span className="text-red-700">{message}</span>
      <button type="button" onClick={run} disabled={isPending}
        className="bg-red-600 text-white rounded-lg px-2.5 py-1 disabled:opacity-50">
        {isPending ? 'Effacement…' : 'Oui, effacer'}
      </button>
      <button type="button" onClick={() => setConfirm(false)} disabled={isPending}
        className="border border-gray-300 text-gray-600 rounded-lg px-2.5 py-1 hover:bg-gray-50">
        Annuler
      </button>
    </span>
  )
}
