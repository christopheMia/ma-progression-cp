'use client'
import { useState, useTransition } from 'react'
import TimetableGrid, { Creneau } from '@/components/TimetableGrid'
import { updateEmploiDuTemps, rechargerEmploiDuTempsType } from '@/lib/actions/parametres'

export default function EmploiDuTempsGrille({ initial }: { initial: Creneau[] }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [key, setKey] = useState(0)

  return (
    <div className="space-y-3">
      <TimetableGrid
        key={key}
        initial={initial}
        saving={isPending}
        finishLabel="Enregistrer l'emploi du temps"
        onSave={(creneaux) => {
          setSaved(false)
          startTransition(async () => { await updateEmploiDuTemps(creneaux); setSaved(true) })
        }}
      />
      {saved && !isPending && <span className="text-sm text-green-600">✓ Enregistré</span>}
      <button
        onClick={() => startTransition(async () => { await rechargerEmploiDuTempsType(); setKey(k => k + 1); location.reload() })}
        className="text-xs text-violet-500 hover:underline">
        ↻ Recharger l&apos;emploi du temps type (efface le mien)
      </button>
    </div>
  )
}
