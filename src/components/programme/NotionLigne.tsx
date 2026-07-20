'use client'
import { useTransition } from 'react'
import { rattacherNotionManuel } from '@/lib/actions/mapping'

export type CompChoix = { id: string; domaine: string; libelle: string }

/** Une notion avec le menu pour choisir/corriger la compétence officielle rattachée. */
export default function NotionLigne({ matiere, semaine, notion, competenceId, competences }: {
  matiere: string
  semaine: number
  notion: string
  competenceId?: string
  competences: CompChoix[]
}) {
  const [isPending, startTransition] = useTransition()

  function onChange(id: string) {
    if (!id) return
    startTransition(async () => {
      await rattacherNotionManuel(matiere, semaine, notion, id)
      window.location.reload()
    })
  }

  return (
    <li className="text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-gray-800">{notion}</span>
      {!competenceId && <span className="text-xs text-amber-600">à rattacher</span>}
      <select
        value={competenceId ?? ''}
        disabled={isPending}
        onChange={e => onChange(e.target.value)}
        aria-label={`Compétence pour ${notion}`}
        className="text-xs border border-violet-200 rounded px-1.5 py-0.5 bg-white text-violet-800 max-w-full disabled:opacity-50">
        <option value="">— choisir une compétence —</option>
        {competences.map(c => (
          <option key={c.id} value={c.id}>{c.domaine} : {c.libelle}</option>
        ))}
      </select>
    </li>
  )
}
