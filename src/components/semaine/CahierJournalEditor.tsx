'use client'
import { useState, useTransition, useEffect, useRef } from 'react'
import { FileDown, NotebookPen, Printer, RefreshCw, Sparkles } from 'lucide-react'
import { JourJournal } from '@/types'
import { genererOuChargerJournal, sauvegarderJournal, regenererJournal } from '@/lib/actions/journal'
import { exporterJournalWord } from '@/lib/export-word'
import { imprimerElement } from '@/lib/print'
import GoogleDocsButton from './GoogleDocsButton'
import Bouton from '@/components/ui/Bouton'

export default function CahierJournalEditor({ semaineId, numeroSemaine, francais = [], maths = [] }: {
  semaineId: string; numeroSemaine: number; francais?: string[]; maths?: string[]
}) {
  const [journal, setJournal] = useState<JourJournal[] | null>(null)
  const [generatingJour, setGeneratingJour] = useState<number | null>(null)
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

  function regenerer() {
    if (!confirm('Régénérer le cahier journal à partir de ton emploi du temps et de tes méthodes ? Le contenu actuel de cette semaine sera remplacé.')) return
    startTransition(async () => {
      const data = await regenererJournal(semaineId)
      setJournal(data)
    })
  }

  async function genererJournee(jourIdx: number) {
    if (!journal) return
    const seances = journal[jourIdx].seances
    const creneaux = seances.filter(s => s.type === 'cours').map(s => ({ heure_debut: s.heure_debut, heure_fin: s.heure_fin, matiere: s.matiere }))
    setGeneratingJour(jourIdx)
    try {
      const res = await fetch('/api/ia-journal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroSemaine, creneaux, francais, maths }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? 'Erreur IA'); return }
      const deroulements: string[] = data.deroulements ?? []
      let k = 0
      const base = journal ?? []
      const next = base.map((j, ji) => ji !== jourIdx ? j : {
        ...j,
        seances: j.seances.map(s => {
          if (s.type !== 'cours') return s
          const gen = deroulements[k++]
          // On complete seulement : si la case a deja un contenu (importe de la
          // methode ou tape a la main), on le garde ; sinon on met la proposition IA.
          return (s.deroulement ?? '').trim() ? s : { ...s, deroulement: gen ?? s.deroulement }
        }),
      })
      setJournal(next)
      // startTransition doit rester HORS de la fonction de mise a jour de setJournal
      // (React execute cette fonction pendant le rendu, ou startTransition est interdit).
      startTransition(() => sauvegarderJournal(semaineId, next))
    } finally { setGeneratingJour(null) }
  }

  function updateDeroulement(jourIdx: number, seanceIdx: number, value: string) {
    if (!journal) return
    const next = journal.map((j, ji) =>
      ji !== jourIdx ? j : { ...j, seances: j.seances.map((s, si) => si !== seanceIdx ? s : { ...s, deroulement: value }) }
    )
    setJournal(next)
    // Idem : la sauvegarde (startTransition) reste hors de la fonction de mise a jour.
    startTransition(() => sauvegarderJournal(semaineId, next))
  }

  if (!journal) {
    return (
      <div className="bg-white border rounded-2xl p-5 text-center shadow-sm">
        <h2 className="font-bold text-gray-700 mb-3">📋 Cahier journal</h2>
        <Bouton type="button" variant="principal" size="lg" icon={NotebookPen}
          loading={isPending} onClick={generer}>
          Générer le cahier journal
        </Bouton>
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
          <Bouton type="button" variant="neutre" size="sm" icon={RefreshCw}
            onClick={regenerer}
            loading={isPending}
            title="Recrée le cahier journal à partir de ton emploi du temps et de tes méthodes (remplace le contenu de la semaine)."
            className="text-sm">
            Régénérer
          </Bouton>
          <Bouton type="button" variant="contour" size="sm" icon={FileDown}
            onClick={handleExportWord}
            disabled={!journal}
            loading={exporting}
            title="Télécharge un document Word (.docx). Ouvrez-le avec Word, ou importez-le dans Google Docs (Fichier → Importer)."
            className="text-sm">
            Word (.docx)
          </Bouton>
          <GoogleDocsButton journal={journal} numeroSemaine={numeroSemaine} />
          <Bouton type="button" variant="neutre" size="sm" icon={Printer}
            onClick={() => imprimerElement(journalRef.current)}
            className="text-sm">
            PDF
          </Bouton>
        </div>
      </div>

      <p className="text-xs text-gray-400 -mt-3 no-print">
        💡 Complète le déroulement de chaque matière. Tout se sauvegarde automatiquement.
      </p>

      {exported && (
        <div className="no-print -mt-2 text-sm bg-green-50 border border-green-200 text-green-800 rounded-lg px-3 py-2">
          ✓ Document <strong>cahier-journal-semaine-{numeroSemaine}.docx</strong> téléchargé (dossier « Téléchargements »).
          Double-cliquez dessus pour l&apos;ouvrir dans Word, ou dans Google Docs : <em>Fichier → Importer</em>.
        </div>
      )}

      {journal.map((jour, ji) => (
        <div key={jour.jour} className="border rounded-xl overflow-hidden print-section">
          <div className="bg-violet-50 px-4 py-2 font-semibold text-violet-800 capitalize flex justify-between items-center">
            <span>{jour.jour}</span>
            <Bouton type="button" variant="secondaire" size="sm" icon={Sparkles}
              loading={generatingJour === ji} onClick={() => genererJournee(ji)}
              className="no-print text-xs">
              Générer la journée
            </Bouton>
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-violet-50/50 text-violet-700">
                <th className="border-b p-2 text-left w-24">Horaires</th>
                <th className="border-b p-2 text-left w-40">Matière</th>
                <th className="border-b p-2 text-left">Déroulement</th>
              </tr>
            </thead>
            <tbody>
              {jour.seances.map((s, si) => (
                <tr key={si} className={s.type === 'routine' ? 'bg-gray-50 text-gray-500 italic' : ''}>
                  <td className="border-b p-2 align-top whitespace-nowrap text-xs text-gray-500">{s.heure_debut}–{s.heure_fin}</td>
                  <td className="border-b p-2 align-top font-medium text-gray-700">{s.matiere}</td>
                  <td className="border-b p-1 align-top">
                    {s.type === 'routine'
                      ? <span className="text-xs">—</span>
                      : <textarea value={s.deroulement} placeholder="(à compléter)"
                          onChange={e => updateDeroulement(ji, si, e.target.value)}
                          rows={Math.max(2, s.deroulement.split('\n').length)}
                          className="w-full border rounded-lg p-2 text-sm text-gray-900 bg-white focus:ring-1 focus:ring-violet-400 outline-none resize-y" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
