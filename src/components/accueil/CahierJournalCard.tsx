'use client'
import { useState } from 'react'
import Link from 'next/link'
import { NotebookPen, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react'

export type SemaineLien = { id: string; numero: number; libelle: string }

/**
 * Carte "Cahier journal en cours" : acces direct au cahier de la semaine
 * courante, plus un depliant vers les semaines A VENIR (demande du 20/07 :
 * pouvoir preparer les cahiers des semaines suivantes sans passer par le
 * planning annuel).
 *
 * Le depliant est un bouton SOEUR du lien principal (jamais imbrique dans le
 * <Link>, ce qui serait du HTML invalide et casserait le clic).
 */
export default function CahierJournalCard({ courante, suivantes }: {
  courante: SemaineLien | null
  suivantes: SemaineLien[]
}) {
  const [ouvert, setOuvert] = useState(false)

  if (!courante) {
    return (
      <Link href="/planning"
        className="carte-i group flex flex-col bg-white border border-slate-200 rounded-2xl p-5">
        <NotebookPen size={26} className="text-violet-600 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
        <div className="font-semibold text-slate-900 mt-1">Cahier journal</div>
        <div className="text-sm text-slate-500">Choisis une semaine dans le planning</div>
      </Link>
    )
  }

  return (
    <div className="carte-i flex flex-col bg-white border border-slate-200 rounded-2xl p-5">
      <Link href={`/semaine/${courante.id}`} className="group block">
        <NotebookPen size={26} className="text-violet-600 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
        <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1">
          Cahier journal en cours
          <ArrowRight size={16} className="text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        </div>
        <div className="text-sm text-slate-500">
          Semaine {courante.numero} · {courante.libelle}
        </div>
      </Link>

      {suivantes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <button type="button" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert}
            className="text-sm text-violet-600 font-medium hover:underline">
            Semaines à venir {ouvert ? '▴' : '▾'}
          </button>
          {ouvert && (
            <ul className="mt-2 space-y-1">
              {suivantes.map(s => (
                <li key={s.id}>
                  <Link href={`/semaine/${s.id}`}
                    className="block rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-violet-50 hover:text-violet-700 transition-colors">
                    <span className="font-medium text-slate-800">S{s.numero}</span> · {s.libelle}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
