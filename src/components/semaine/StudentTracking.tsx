'use client'
import { Eleve, Acquisition, Semaine, Appreciation } from '@/types'
import { toggleAcquisition } from '@/lib/actions/semaine'
import { upsertAppreciation } from '@/lib/actions/appreciation'
import { imprimerElement } from '@/lib/print'
import { celebrate } from '@/lib/confetti'
import { useTransition, useState, useEffect, useRef } from 'react'

type ApprState = { statut: string | null; commentaire: string }

export default function StudentTracking({ semaine, eleves, acquisitions, appreciations }: {
  semaine: Semaine
  eleves: Eleve[]
  acquisitions: Acquisition[]
  appreciations: Appreciation[]
}) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const wasPending = useRef(false)
  const blocRef = useRef<HTMLDivElement>(null)

  const [appr, setAppr] = useState<Record<string, ApprState>>(() => {
    const init: Record<string, ApprState> = {}
    for (const a of appreciations) init[a.eleve_id] = { statut: a.statut, commentaire: a.commentaire ?? '' }
    return init
  })

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
  function getAppr(eleveId: string): ApprState {
    return appr[eleveId] ?? { statut: null, commentaire: '' }
  }

  function handleToggle(eleveId: string, grapheme: string, current: boolean) {
    if (!current && nbAcquis(eleveId) === semaine.graphemes.length - 1 && semaine.graphemes.length > 0) {
      celebrate()
    }
    startTransition(() => toggleAcquisition(semaine.id, eleveId, grapheme, !current))
  }

  function handleStatut(eleveId: string, value: string) {
    const current = getAppr(eleveId)
    const statut = current.statut === value ? null : value
    const next = { ...current, statut }
    setAppr(p => ({ ...p, [eleveId]: next }))
    startTransition(() => upsertAppreciation(semaine.id, eleveId, statut, next.commentaire))
  }

  function handleComment(eleveId: string, commentaire: string) {
    setAppr(p => ({ ...p, [eleveId]: { ...getAppr(eleveId), commentaire } }))
  }

  function saveComment(eleveId: string) {
    const a = getAppr(eleveId)
    startTransition(() => upsertAppreciation(semaine.id, eleveId, a.statut, a.commentaire))
  }

  return (
    <div ref={blocRef} className="bg-white border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="font-bold text-gray-700">✅ Suivi des élèves</h2>
        {isPending && <span className="text-xs text-gray-400">Enregistrement...</span>}
        {saved && !isPending && <span className="text-xs text-green-600">✓ Sauvegardé</span>}
        <button
          onClick={() => imprimerElement(blocRef.current)}
          className="no-print ml-auto text-sm border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-50">
          🖨️ Imprimer
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Pour chaque élève : cliquez l&apos;<strong>étoile</strong> du graphème acquis (★), donnez un
        <strong> bilan</strong> de la semaine, et ajoutez un <strong>commentaire</strong> si besoin.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-100">
              <th className="text-left text-sm font-bold text-gray-700 pb-2 pr-4">Élève</th>
              {semaine.graphemes.map(g => (
                <th key={g} className="pb-2 px-2 align-bottom">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wide text-gray-400">son</span>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 font-bold"
                      title={`Son « ${g} » — étoile si l'élève le maîtrise`}>{g}</span>
                  </div>
                </th>
              ))}
              <th className="text-center text-sm font-bold text-gray-700 pb-2 px-3">Progrès</th>
              <th className="text-center text-sm font-bold text-gray-700 pb-2 px-3">Bilan de la semaine</th>
              <th className="text-left text-sm font-bold text-gray-700 pb-2 pl-3">Commentaire</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {eleves.map(eleve => {
              const acquisEleve = nbAcquis(eleve.id)
              const totalG = semaine.graphemes.length
              const complet = totalG > 0 && acquisEleve === totalG
              const a = getAppr(eleve.id)
              return (
                <tr key={eleve.id} className={complet ? 'bg-amber-50/60' : undefined}>
                  <td className="py-2 pr-4 font-medium text-gray-700 whitespace-nowrap">
                    {complet && '🏆 '}{eleve.prenom}
                  </td>
                  {semaine.graphemes.map(grapheme => {
                    const acquis = isAcquis(eleve.id, grapheme)
                    return (
                      <td key={grapheme} className="text-center py-2 px-2">
                        <button
                          type="button"
                          onClick={() => handleToggle(eleve.id, grapheme, acquis)}
                          disabled={isPending}
                          title={`${eleve.prenom} · « ${grapheme} » — ${acquis ? 'acquis ✓ (cliquer pour annuler)' : 'cliquer pour marquer comme acquis'}`}
                          className={`text-xl leading-none transition-transform hover:scale-125 disabled:opacity-50 ${acquis ? 'text-amber-400' : 'text-gray-300'}`}>
                          {acquis ? '★' : '☆'}
                        </button>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 justify-center">
                      <span className="text-xs text-gray-400 tabular-nums">{acquisEleve}/{totalG}</span>
                      <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${complet ? 'bg-amber-400' : 'bg-emerald-400'}`}
                          style={{ width: `${totalG > 0 ? (acquisEleve / totalG) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-center">
                      <button type="button" onClick={() => handleStatut(eleve.id, 'acquis')} disabled={isPending}
                        className={`text-xs rounded-full px-2.5 py-1 border transition-colors disabled:opacity-50 ${
                          a.statut === 'acquis'
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'text-gray-500 border-gray-300 hover:bg-emerald-50'
                        }`}>
                        ✓ Acquis
                      </button>
                      <button type="button" onClick={() => handleStatut(eleve.id, 'pas_acquis')} disabled={isPending}
                        className={`text-xs rounded-full px-2.5 py-1 border transition-colors disabled:opacity-50 ${
                          a.statut === 'pas_acquis'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'text-gray-500 border-gray-300 hover:bg-amber-50'
                        }`}>
                        Pas encore
                      </button>
                    </div>
                  </td>
                  <td className="pl-3 py-2">
                    <input
                      value={a.commentaire}
                      onChange={e => handleComment(eleve.id, e.target.value)}
                      onBlur={() => saveComment(eleve.id)}
                      placeholder="Remarque libre…"
                      className="w-44 border border-gray-200 rounded-lg p-1.5 text-sm text-gray-900 bg-white focus:ring-1 focus:ring-violet-400 outline-none" />
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
