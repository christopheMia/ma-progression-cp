'use client'
import { useState, useTransition } from 'react'
import { CalendarDays } from 'lucide-react'
import { realignerSemaines } from '@/lib/actions/parametres'
import Bouton from '@/components/ui/Bouton'

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
      <Bouton type="button" variant="contour" size="sm" icon={CalendarDays}
        onClick={() => setConfirm(true)} className="shrink-0">
        Caler sur le calendrier
      </Bouton>
    )
  }

  return (
    <span className="flex items-center gap-2 flex-wrap justify-end text-xs">
      <span className="text-violet-700">Recale les semaines sur les vraies dates (saute les vacances). Le suivi est conservé.</span>
      <Bouton type="button" variant="secondaire" size="sm" onClick={run} loading={isPending}>
        {isPending ? 'Recalage…' : 'Oui, recaler'}
      </Bouton>
      <Bouton type="button" variant="fantome" size="sm" onClick={() => setConfirm(false)} disabled={isPending}>
        Annuler
      </Bouton>
    </span>
  )
}
