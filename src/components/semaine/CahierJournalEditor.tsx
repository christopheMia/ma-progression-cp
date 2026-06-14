'use client'
import { useState, useTransition, useEffect, useRef } from 'react'
import { JourJournal } from '@/types'
import { genererOuChargerJournal, sauvegarderJournal } from '@/lib/actions/journal'
import { exporterJournalWord } from '@/lib/export-word'
import { imprimerElement } from '@/lib/print'

export default function CahierJournalEditor({ semaineId, numeroSemaine }: { semaineId: string; numeroSemaine: number }) {
  const [journal, setJournal] = useState<JourJournal[] | null>(null)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const wasPending = useRef(false)
  const journalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (wasPending.current && !isPending && journal !== null) {
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 2000)
      return () => clearTimeout(t)
    }
    wasPending.current = isPending
  }, [isPending, journal])

  function generer() {
    startTransition(async () => {
      const data = await genererOuChargerJournal(semaineId)
      setJournal(data)
    })
  }

  function updateSeance(jourIdx: number, seanceIdx: number, field: string, value: string) {
    setJournal(prev => {
      if (!prev) return prev
      const next = prev.map((j, ji) =>
        ji !== jourIdx ? j : {
          ...j,
          seances: j.seances.map((s, si) =>
            si !== seanceIdx ? s : { ...s, [field]: value }
          )
        }
      )
      startTransition(() => sauvegarderJournal(semaineId, next))
      return next
    })
  }

  if (!journal) {
    return (
      <div className="bg-white border rounded-2xl p-5 text-center shadow-sm">
        <h2 className="font-bold text-gray-700 mb-3">📋 Cahier journal</h2>
        <button onClick={generer} disabled={isPending}
          className="bg-indigo-700 text-white rounded-xl px-6 py-3 font-semibold hover:bg-indigo-800 disabled:opacity-50">
          {isPending ? 'Génération...' : 'Générer le cahier journal'}
        </button>
      </div>
    )
  }

  return (
    <div ref={journalRef} className="bg-white border rounded-2xl p-5 space-y-6 shadow-sm border-l-4 border-l-violet-400">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-gray-700">📋 Cahier journal</h2>
          {isPending && <span className="text-xs text-gray-400">Enregistrement...</span>}
          {saved && !isPending && <span className="text-xs text-green-600">✓ Sauvegardé</span>}
        </div>
        <div className="flex gap-2 no-print">
          <button
            onClick={() => exporterJournalWord(journal, numeroSemaine)}
            disabled={!journal}
            className="text-sm border border-indigo-300 text-indigo-700 rounded-lg px-3 py-1.5 hover:bg-indigo-50 disabled:opacity-30">
            📄 Word
          </button>
          <button
            onClick={() => imprimerElement(journalRef.current)}
            className="text-sm border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-50">
            🖨️ PDF
          </button>
        </div>
      </div>

      {journal.map((jour, ji) => (
        <div key={jour.jour} className="border rounded-xl overflow-hidden print-section">
          <div className="bg-indigo-50 px-4 py-2 font-semibold text-indigo-800 capitalize">{jour.jour}</div>
          <div className="divide-y">
            {jour.seances.map((seance, si) => (
              <div key={si} className="p-4 grid grid-cols-[auto_1fr] gap-3">
                <div className="text-xs text-gray-400 whitespace-nowrap mt-1">
                  {seance.heure_debut}–{seance.heure_fin}<br/>
                  <span className="font-semibold text-gray-600">{seance.matiere}</span>
                </div>
                <div className="space-y-2">
                  <input value={seance.objectif} placeholder="Objectif"
                    onChange={e => updateSeance(ji, si, 'objectif', e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm text-gray-900 bg-white focus:ring-1 focus:ring-indigo-400 outline-none" />
                  <input value={seance.activite} placeholder="Activité principale"
                    onChange={e => updateSeance(ji, si, 'activite', e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm text-gray-900 bg-white focus:ring-1 focus:ring-indigo-400 outline-none" />
                  <input value={seance.materiel} placeholder="Matériel"
                    onChange={e => updateSeance(ji, si, 'materiel', e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm text-gray-900 bg-white focus:ring-1 focus:ring-indigo-400 outline-none" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
