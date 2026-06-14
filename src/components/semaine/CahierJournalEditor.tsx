'use client'
import { useState, useTransition, useEffect, useRef } from 'react'
import { JourJournal } from '@/types'
import { genererOuChargerJournal, sauvegarderJournal } from '@/lib/actions/journal'
import { exporterJournalWord } from '@/lib/export-word'
import { imprimerElement } from '@/lib/print'
import GoogleDocsButton from './GoogleDocsButton'

export default function CahierJournalEditor({ semaineId, numeroSemaine }: { semaineId: string; numeroSemaine: number }) {
  const [journal, setJournal] = useState<JourJournal[] | null>(null)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)
  const wasPending = useRef(false)
  const journalRef = useRef<HTMLDivElement>(null)

  async function handleExportWord() {
    if (!journal) return
    setExporting(true)
    setExported(false)
    try {
      await exporterJournalWord(journal, numeroSemaine)
      setExported(true)
      setTimeout(() => setExported(false), 6000)
    } finally {
      setExporting(false)
    }
  }

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
          className="bg-violet-700 text-white rounded-xl px-6 py-3 font-semibold hover:bg-violet-800 disabled:opacity-50">
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
            onClick={handleExportWord}
            disabled={!journal || exporting}
            title="Télécharge un document Word (.docx). Ouvrez-le avec Word, ou importez-le dans Google Docs (Fichier → Importer)."
            className="text-sm border border-violet-300 text-violet-700 rounded-lg px-3 py-1.5 hover:bg-violet-50 disabled:opacity-30">
            {exporting ? 'Génération…' : '⬇️ Word (.docx)'}
          </button>
          <GoogleDocsButton journal={journal} numeroSemaine={numeroSemaine} />
          <button
            onClick={() => imprimerElement(journalRef.current)}
            className="text-sm border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-50">
            🖨️ PDF
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 -mt-3 no-print">
        💡 Complétez chaque séance : remplissez l&apos;objectif, l&apos;activité et le matériel. Tout se sauvegarde automatiquement.
      </p>

      {exported && (
        <div className="no-print -mt-2 text-sm bg-green-50 border border-green-200 text-green-800 rounded-lg px-3 py-2">
          ✓ Document <strong>cahier-journal-semaine-{numeroSemaine}.docx</strong> téléchargé (dossier « Téléchargements »).
          Double-cliquez dessus pour l&apos;ouvrir dans Word, ou dans Google Docs : <em>Fichier → Importer</em>.
        </div>
      )}

      {journal.map((jour, ji) => (
        <div key={jour.jour} className="border rounded-xl overflow-hidden print-section">
          <div className="bg-violet-50 px-4 py-2 font-semibold text-violet-800 capitalize">{jour.jour}</div>
          <div className="divide-y">
            {jour.seances.map((seance, si) => (
              <div key={si} className="p-4 grid grid-cols-[auto_1fr] gap-3">
                <div className="text-xs text-gray-400 whitespace-nowrap mt-1">
                  {seance.heure_debut}–{seance.heure_fin}<br/>
                  <span className="font-semibold text-gray-600">{seance.matiere}</span>
                </div>
                <div className="space-y-2">
                  <input value={seance.objectif} placeholder="Objectif"
                    title="Objectif : ce que les élèves doivent apprendre/savoir faire à la fin de la séance"
                    onChange={e => updateSeance(ji, si, 'objectif', e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm text-gray-900 bg-white focus:ring-1 focus:ring-violet-400 outline-none" />
                  <input value={seance.activite} placeholder="Activité principale"
                    title="Activité : ce que font concrètement les élèves (exercice, jeu, lecture…)"
                    onChange={e => updateSeance(ji, si, 'activite', e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm text-gray-900 bg-white focus:ring-1 focus:ring-violet-400 outline-none" />
                  <input value={seance.materiel} placeholder="Matériel"
                    title="Matériel : ce dont vous avez besoin (manuel, fiches, ardoise…)"
                    onChange={e => updateSeance(ji, si, 'materiel', e.target.value)}
                    className="w-full border rounded-lg p-2 text-sm text-gray-900 bg-white focus:ring-1 focus:ring-violet-400 outline-none" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
