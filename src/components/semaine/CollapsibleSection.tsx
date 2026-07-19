'use client'
import { useState, type ReactNode } from 'react'

/** Section repliable : un en-tête cliquable (chevron + titre) au-dessus du contenu.
 *  Léger volontairement (pas de carte englobante) pour ne pas dupliquer les cartes
 *  des blocs qu'il contient. */
export default function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 mb-3 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-violet-300 hover:bg-violet-50/40 transition-colors text-left"
      >
        <span className="font-bold text-gray-700">{title}</span>
        <span className="flex items-center gap-1 shrink-0 text-xs font-semibold text-violet-700 bg-violet-100 rounded-full px-3 py-1">
          <span aria-hidden>{open ? '▾' : '▸'}</span>
          {open ? 'Replier' : 'Déplier'}
        </span>
      </button>
      {open && <div className="space-y-4">{children}</div>}
    </div>
  )
}
