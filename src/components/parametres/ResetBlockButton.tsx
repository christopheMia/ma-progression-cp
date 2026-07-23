'use client'
import { useState, useTransition } from 'react'
import { Eraser } from 'lucide-react'
import { reinitialiserBloc } from '@/lib/actions/parametres'
import Bouton from '@/components/ui/Bouton'

type Scope = 'eleves' | 'edt' | 'edt-vide' | 'methodes' | 'suivi' | 'journaux'

/** Petit bouton "remettre à zéro" pour un bloc des paramètres (nouvelle année),
 *  avec confirmation en deux temps pour éviter les accidents.
 *  On force un rechargement complet (location.reload) plutôt que router.refresh :
 *  les éditeurs (élèves, grille EDT) figent leur affichage sur leur prop `initial`
 *  via useState, donc un simple refresh serveur ne changerait rien à l'écran. */
export default function ResetBlockButton({ scope, message, label = 'Remettre à zéro' }: {
  scope: Scope
  message: string
  label?: string
}) {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function run() {
    startTransition(async () => {
      await reinitialiserBloc(scope)
      setConfirm(false)
      window.location.reload()
    })
  }

  if (!confirm) {
    return (
      <Bouton type="button" variant="contour" size="sm" icon={Eraser}
        onClick={() => setConfirm(true)}
        className="shrink-0 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 focus-visible:ring-red-300/60">
        {label}
      </Bouton>
    )
  }

  return (
    <span className="flex items-center gap-2 flex-wrap justify-end text-xs">
      <span className="text-red-700">{message}</span>
      <Bouton type="button" variant="danger" size="sm" onClick={run} loading={isPending}>
        {isPending ? 'Effacement…' : 'Oui, effacer'}
      </Bouton>
      <Bouton type="button" variant="fantome" size="sm" onClick={() => setConfirm(false)} disabled={isPending}>
        Annuler
      </Bouton>
    </span>
  )
}
