'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, TriangleAlert, X } from 'lucide-react'
import ManualSelector from '@/components/setup/ManualSelector'
import { updateManuel } from '@/lib/actions/parametres'
import Bouton from '@/components/ui/Bouton'
import type { ProgressionSemaine } from '@/data/manuels'

export default function ManuelEditor({ currentNom, prenom }: { currentNom: string; prenom?: string }) {
  const [editing, setEditing] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function changer(manuelId: string, customProgression?: ProgressionSemaine[]) {
    startTransition(async () => {
      await updateManuel(manuelId, customProgression)
      setEditing(false)
      setConfirmed(false)
      router.push('/planning')
      router.refresh()
    })
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <p className="text-gray-700">Manuel actuel : <span className="font-semibold">{currentNom}</span></p>
        <Bouton type="button" variant="contour" size="sm" icon={RefreshCw}
          onClick={() => setEditing(true)}>
          Changer de manuel
        </Bouton>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        ⚠️ <strong>Attention</strong> : changer de manuel régénère toute la progression annuelle.
        Le suivi des élèves et les cahiers journaux déjà remplis seront <strong>définitivement effacés</strong>.
      </div>

      {!confirmed ? (
        <div className="flex gap-2">
          <Bouton type="button" variant="danger" icon={TriangleAlert}
            onClick={() => setConfirmed(true)}>
            J'ai compris, choisir un nouveau manuel
          </Bouton>
          <Bouton type="button" variant="neutre" icon={X}
            onClick={() => setEditing(false)}>
            Annuler
          </Bouton>
        </div>
      ) : isPending ? (
        <p className="text-sm text-violet-700">Régénération de la progression…</p>
      ) : (
        <>
          <ManualSelector onSelect={changer} prenom={prenom} />
          <Bouton type="button" variant="fantome" size="sm" icon={X}
            onClick={() => { setConfirmed(false); setEditing(false) }}>
            Annuler
          </Bouton>
        </>
      )}
    </div>
  )
}
