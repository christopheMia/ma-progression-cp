'use client'
import { Eleve, Acquisition, Semaine } from '@/types'
import { toggleAcquisition } from '@/lib/actions/semaine'
import { useTransition, useState, useEffect, useRef } from 'react'

export default function StudentTracking({ semaine, eleves, acquisitions }: {
  semaine: Semaine
  eleves: Eleve[]
  acquisitions: Acquisition[]
}) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const wasPending = useRef(false)

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

  function handleToggle(eleveId: string, grapheme: string, current: boolean) {
    startTransition(() => {
      toggleAcquisition(semaine.id, eleveId, grapheme, !current)
    })
  }

  return (
    <div className="bg-white border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-bold text-gray-700">✅ Suivi des élèves</h2>
        {isPending && <span className="text-xs text-gray-400">Enregistrement...</span>}
        {saved && !isPending && <span className="text-xs text-green-600">✓ Sauvegardé</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-sm font-medium text-gray-500 pb-2">Élève</th>
              {semaine.graphemes.map(g => (
                <th key={g} className="text-center text-sm font-medium text-gray-500 pb-2 px-3">&quot;{g}&quot;</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {eleves.map(eleve => (
              <tr key={eleve.id}>
                <td className="py-2 pr-4 font-medium text-gray-700">{eleve.prenom}</td>
                {semaine.graphemes.map(grapheme => {
                  const acquis = isAcquis(eleve.id, grapheme)
                  return (
                    <td key={grapheme} className="text-center py-2 px-3">
                      <input
                        type="checkbox"
                        checked={acquis}
                        onChange={() => handleToggle(eleve.id, grapheme, acquis)}
                        disabled={isPending}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
