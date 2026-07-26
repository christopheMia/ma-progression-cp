'use client'
import { useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import TimetableGrid, { Creneau } from '@/components/TimetableGrid'
import { updateEmploiDuTemps, rechargerEmploiDuTempsType } from '@/lib/actions/parametres'
import Bouton from '@/components/ui/Bouton'

export default function EmploiDuTempsGrille({ initial }: { initial: Creneau[] }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  function recharger() {
    setReloading(true)
    startTransition(async () => {
      try {
        setErreur(null)
        await rechargerEmploiDuTempsType()
        location.reload()
      } catch (error) {
        setErreur(error instanceof Error ? error.message : String(error))
      } finally {
        setReloading(false)
      }
    })
  }

  return (
    <div className="space-y-3">
      <TimetableGrid
        initial={initial}
        saving={isPending}
        finishLabel="Enregistrer l'emploi du temps"
        onSave={(creneaux) => {
          setSaved(false)
          setErreur(null)
          startTransition(async () => {
            try {
              await updateEmploiDuTemps(creneaux)
              setSaved(true)
            } catch (error) {
              setErreur(error instanceof Error ? error.message : String(error))
            }
          })
        }}
      />
      {saved && !isPending && <span className="text-sm text-green-600">✓ Enregistré</span>}
      {erreur && (
        <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
          {erreur}
        </p>
      )}
      <Bouton type="button" variant="danger" size="sm" icon={RefreshCw}
        loading={reloading} disabled={isPending && !reloading} onClick={recharger}>
        Recharger l&apos;emploi du temps type (efface le mien)
      </Bouton>
    </div>
  )
}
