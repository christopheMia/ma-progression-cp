'use client'
import { useState, useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { proposerRattachements } from '@/lib/actions/mapping'
import Bouton from '@/components/ui/Bouton'

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
      {msg && <span className="text-slate-500">{msg}</span>}
      <Bouton type="button" variant="contour" size="sm" icon={Sparkles} onClick={run} loading={isPending} className="shrink-0">
        {isPending ? 'Analyse…' : `Rattacher ${label} avec l'IA`}
      </Bouton>
    </span>
  )
}
