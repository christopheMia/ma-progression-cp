'use client'
import { useState, useTransition } from 'react'
import { proposerRattachements } from '@/lib/actions/mapping'

/** Lance le rattachement IA des notions d'une matière aux compétences officielles. */
export default function ProposerRattachementsButton({ matiere, label }: { matiere: string; label: string }) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function run() {
    setMsg(null)
    startTransition(async () => {
      try {
        const r = await proposerRattachements(matiere)
        setMsg(`✓ ${r.rattaches} notion(s) rattachée(s) sur ${r.notions}`)
        window.location.reload()
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Erreur IA')
      }
    })
  }

  return (
    <span className="flex items-center gap-2 flex-wrap justify-end text-xs">
      {msg && <span className="text-gray-500">{msg}</span>}
      <button type="button" onClick={run} disabled={isPending}
        className="shrink-0 border border-violet-300 text-violet-700 rounded-lg px-2.5 py-1 hover:bg-violet-50 disabled:opacity-50">
        {isPending ? 'Analyse…' : `✨ Rattacher ${label} avec l'IA`}
      </button>
    </span>
  )
}
