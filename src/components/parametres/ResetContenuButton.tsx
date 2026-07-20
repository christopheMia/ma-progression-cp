'use client'
import { useState, useTransition } from 'react'
import { reinitialiserContenuClasse } from '@/lib/actions/parametres'

/**
 * "Repartir d'une annee vierge" : efface tout le contenu (eleves, semaines,
 * suivi, cahiers journaux, methodes, emploi du temps) mais GARDE la classe.
 *
 * Distinct du bouton "Tout supprimer" juste a cote, qui detruit la classe et
 * renvoie a l'assistant de configuration. Confirmation en deux temps, et on
 * recharge la page ensuite (les editeurs figent leur affichage sur leur prop
 * `initial`).
 */
export default function ResetContenuButton() {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function run() {
    startTransition(async () => {
      await reinitialiserContenuClasse()
      setConfirm(false)
      window.location.reload()
    })
  }

  if (!confirm) {
    return (
      <button type="button" onClick={() => setConfirm(true)}
        className="text-sm border border-red-300 text-red-700 rounded-lg px-3 py-1.5 hover:bg-red-50">
        🧽 Effacer tout sauf ma classe
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-red-700">
        Efface les élèves, les semaines, le suivi, les cahiers journaux, les méthodes et
        l&apos;emploi du temps (qui devient <strong>vide</strong>). Ta classe est conservée :
        ton prénom, ton manuel et ta date de rentrée restent en place.
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={run} disabled={isPending}
          className="bg-red-600 text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-50">
          {isPending ? 'Effacement…' : 'Oui, effacer le contenu'}
        </button>
        <button type="button" onClick={() => setConfirm(false)} disabled={isPending}
          className="border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50">
          Annuler
        </button>
      </div>
    </div>
  )
}
