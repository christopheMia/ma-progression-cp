'use client'
import { useState, useTransition } from 'react'
import { Eraser } from 'lucide-react'
import { reinitialiserContenuClasse } from '@/lib/actions/parametres'
import Bouton from '@/components/ui/Bouton'

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
      <Bouton type="button" variant="contour" size="sm" icon={Eraser} onClick={() => setConfirm(true)}
        className="text-red-700 border-red-300 hover:bg-red-50 hover:border-red-400 focus-visible:ring-red-300/60">
        Effacer tout sauf ma classe
      </Bouton>
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
        <Bouton type="button" variant="danger" size="sm" onClick={run} loading={isPending}>
          {isPending ? 'Effacement…' : 'Oui, effacer le contenu'}
        </Bouton>
        <Bouton type="button" variant="fantome" size="sm" onClick={() => setConfirm(false)} disabled={isPending}>
          Annuler
        </Bouton>
      </div>
    </div>
  )
}
