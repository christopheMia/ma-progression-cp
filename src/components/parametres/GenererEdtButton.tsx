'use client'
import { useState, useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { genererEmploiDuTemps } from '@/lib/actions/parametres'
import EdtExplicationModal from './EdtExplicationModal'
import Bouton from '@/components/ui/Bouton'

/** Bouton "Générer mon emploi du temps" depuis le volume horaire officiel.
 *  La confirmation passe par une fenêtre qui détaille EXACTEMENT ce qui est pris
 *  en compte (volumes officiels, cadre de journée, règles de placement) : la
 *  génération remplace l'EDT existant, l'enseignante doit pouvoir vérifier avant.
 *  On recharge ensuite la page (les éditeurs figent leur affichage sur leur prop
 *  initial). */
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

  return (
    <>
      <Bouton type="button" variant="contour" size="sm" icon={Sparkles}
        onClick={() => setConfirm(true)} className="shrink-0">
        Générer depuis le programme
      </Bouton>
      {confirm && (
        <EdtExplicationModal
          onConfirm={run}
          onCancel={() => setConfirm(false)}
          isPending={isPending}
        />
      )}
    </>
  )
}
