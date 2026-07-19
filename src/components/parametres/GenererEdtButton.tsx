'use client'
import { useState, useTransition } from 'react'
import { genererEmploiDuTemps } from '@/lib/actions/parametres'

/** Bouton "Générer mon emploi du temps" depuis le volume horaire officiel.
 *  Remplace l'EDT courant (confirmation en deux temps) puis recharge la page
 *  (les éditeurs figent leur affichage sur leur prop initial). */
export default function GenererEdtButton() {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function run() {
    startTransition(async () => {
      await genererEmploiDuTemps(true)
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
        ✨ Générer depuis le programme
      </button>
    )
  }

  return (
    <span className="flex items-center gap-2 flex-wrap justify-end text-xs">
      <span className="text-violet-700">Construit l&apos;emploi du temps depuis le volume horaire officiel (remplace l&apos;actuel).</span>
      <button type="button" onClick={run} disabled={isPending}
        className="bg-violet-600 text-white rounded-lg px-2.5 py-1 disabled:opacity-50">
        {isPending ? 'Génération…' : 'Oui, générer'}
      </button>
      <button type="button" onClick={() => setConfirm(false)} disabled={isPending}
        className="border border-gray-300 text-gray-600 rounded-lg px-2.5 py-1 hover:bg-gray-50">
        Annuler
      </button>
    </span>
  )
}
