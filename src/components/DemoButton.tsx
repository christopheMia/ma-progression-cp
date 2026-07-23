'use client'
import { useState, useTransition } from 'react'
import { GraduationCap, X } from 'lucide-react'
import { chargerClasseDemo } from '@/lib/actions/demo'
import Bouton from '@/components/ui/Bouton'

export default function DemoButton({ confirmer = false }: { confirmer?: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [armed, setArmed] = useState(false)

  function lancer() {
    startTransition(async () => {
      await chargerClasseDemo()
    })
  }

  if (confirmer && !armed) {
    return (
      <Bouton type="button" variant="contour" size="sm" icon={GraduationCap}
        onClick={() => setArmed(true)}>
        Charger une classe de démonstration
      </Bouton>
    )
  }

  if (confirmer && armed) {
    return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          ⚠️ Cela <strong>remplace votre configuration actuelle</strong> par une classe de démonstration.
        </div>
        <div className="flex gap-2">
          <Bouton type="button" variant="danger" icon={GraduationCap} loading={isPending}
            onClick={lancer}>
            Oui, charger la démo
          </Bouton>
          <Bouton type="button" variant="neutre" icon={X} disabled={isPending}
            onClick={() => setArmed(false)}>
            Annuler
          </Bouton>
        </div>
      </div>
    )
  }

  return (
    <Bouton type="button" variant="contour" size="sm" icon={GraduationCap}
      loading={isPending} onClick={lancer}>
      Charger une classe de démonstration
    </Bouton>
  )
}
