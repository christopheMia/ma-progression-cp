'use client'
import { useState } from 'react'
import Link from 'next/link'

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
        className="group flex flex-col bg-white border border-slate-200 rounded-2xl p-5 hover:border-violet-300 hover:shadow-sm transition-all">
        <div className="text-2xl">📔</div>
        <div className="font-semibold text-slate-900 mt-1">Cahier journal</div>
        <div className="text-sm text-slate-500">Choisis une semaine dans le planning</div>
      </Link>
    )
  }

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-2xl p-5 hover:border-violet-300 hover:shadow-sm transition-all">
      <Link href={`/semaine/${courante.id}`} className="group block">
        <div className="text-2xl">📔</div>
        <div className="font-semibold text-slate-900 mt-1">
          Cahier journal en cours <span className="text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
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
