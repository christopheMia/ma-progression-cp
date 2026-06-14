'use client'
import { Eleve, Acquisition, Semaine } from '@/types'
import { toggleAcquisition } from '@/lib/actions/semaine'
import { imprimerElement } from '@/lib/print'
import { celebrate } from '@/lib/confetti'
import { useTransition, useState, useEffect, useRef } from 'react'

export default function StudentTracking({ semaine, eleves, acquisitions }: {
  semaine: Semaine
  eleves: Eleve[]
  acquisitions: Acquisition[]
}) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const wasPending = useRef(false)
  const blocRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (wasPending.current && !isPending) {
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 2000)
      return () => clearTimeout(t)
    }
    wasPending.current = isPending
  }, [isPending])

  function isAcquis(eleveId: string, grapheme: string) {
    return acquisitions.some(a => a.eleve_id === eleveId && a.grapheme === grapheme && a.acquis)
  }

  function nbAcquis(eleveId: string) {
    return semaine.graphemes.filter(g => isAcquis(eleveId, g)).length
  }

  function handleToggle(eleveId: string, grapheme: string, current: boolean) {
    // Célébration si on valide le dernier graphème manquant de l'élève
    if (!current && nbAcquis(eleveId) === semaine.graphemes.length - 1 && semaine.graphemes.length > 0) {
      celebrate()
    }
    startTransition(() => {
      toggleAcquisition(semaine.id, eleveId, grapheme, !current)
    })
  }

  return (
    <div ref={blocRef} className="bg-white border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-bold text-gray-700">✅ Suivi des élèves</h2>
        {isPending && <span className="text-xs text-gray-400">Enregistrement...</span>}
        {saved && !isPending && <span className="text-xs text-green-600">✓ Sauvegardé</span>}
        <button
          onClick={() => imprimerElement(blocRef.current)}
          className="no-print ml-auto text-sm border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-50">
          🖨️ Imprimer
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        💡 Cliquez sur une étoile pour marquer un graphème comme acquis (★ = acquis, ☆ = pas encore).
        Survolez une étoile pour voir le détail.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-sm font-medium text-gray-500 pb-2">Élève</th>
              {semaine.graphemes.map(g => (
                <th key={g} className="text-center text-sm font-medium text-gray-500 pb-2 px-3">&quot;{g}&quot;</th>
              ))}
              <th className="text-right text-sm font-medium text-gray-500 pb-2 pl-3">Progrès</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {eleves.map(eleve => {
              const acquisEleve = nbAcquis(eleve.id)
              const totalG = semaine.graphemes.length
              const complet = totalG > 0 && acquisEleve === totalG
              return (
                <tr key={eleve.id} className={complet ? 'bg-amber-50/60' : undefined}>
                  <td className="py-2 pr-4 font-medium text-gray-700 whitespace-nowrap">
                    {complet && '🏆 '}{eleve.prenom}
                  </td>
                  {semaine.graphemes.map(grapheme => {
                    const acquis = isAcquis(eleve.id, grapheme)
                    return (
                      <td key={grapheme} className="text-center py-2 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggle(eleve.id, grapheme, acquis)}
                          disabled={isPending}
                          aria-label={acquis ? 'Acquis' : 'Non acquis'}
                          title={`${eleve.prenom} · « ${grapheme} » — ${acquis ? 'acquis ✓ (cliquer pour annuler)' : 'cliquer pour marquer comme acquis'}`}
                          className={`text-xl leading-none transition-transform hover:scale-125 disabled:opacity-50 ${acquis ? 'text-amber-400' : 'text-gray-300'}`}>
                          {acquis ? '★' : '☆'}
                        </button>
                      </td>
                    )
                  })}
                  <td className="pl-3 py-2 w-28">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-xs text-gray-400 tabular-nums">{acquisEleve}/{totalG}</span>
                      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${complet ? 'bg-amber-400' : 'bg-emerald-400'}`}
                          style={{ width: `${totalG > 0 ? (acquisEleve / totalG) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
