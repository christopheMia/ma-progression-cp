'use client'

import { useState, useTransition, useRef } from 'react'
import {
  FileDown,
  NotebookPen,
  Pencil,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import type { JourJournal, SeanceJournal } from '@/types'
import {
  genererOuChargerJournal,
  sauvegarderJournal,
  regenererJournal,
} from '@/lib/actions/journal'
import {
  modifierSeanceJournal,
  supprimerSeanceJournal,
} from '@/lib/cahier-journal-edition'
import { heureSansSecondes } from '@/lib/horaires'
import { exporterJournalWord } from '@/lib/export-word'
import { imprimerElement } from '@/lib/print'
import GoogleDocsButton from './GoogleDocsButton'
import Bouton from '@/components/ui/Bouton'

type AdresseSeance = {
  jourIndex: number
  seanceIndex: number
}

export default function CahierJournalEditor({
  semaineId,
  numeroSemaine,
}: {
  semaineId: string
  numeroSemaine: number
}) {
  const [journal, setJournal] = useState<JourJournal[] | null>(null)
  const [edition, setEdition] = useState<AdresseSeance | null>(null)
  const [brouillon, setBrouillon] = useState<SeanceJournal | null>(null)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [erreur, setErreur] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)
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

  function afficherSauvegarde() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function generer() {
    setErreur('')
    startTransition(async () => {
      try {
        const data = await genererOuChargerJournal(semaineId)
        setJournal(data)
      } catch (error) {
        setErreur(error instanceof Error ? error.message : 'Le cahier journal n’a pas pu être ouvert.')
      }
    })
  }

  function regenerer() {
    if (!confirm(
      'Régénérer le cahier journal à partir de ton emploi du temps et de tes méthodes ? '
      + 'Le contenu actuel de cette semaine sera remplacé.',
    )) return

    setErreur('')
    setEdition(null)
    setBrouillon(null)
    startTransition(async () => {
      try {
        const data = await regenererJournal(semaineId)
        setJournal(data)
        afficherSauvegarde()
      } catch (error) {
        setErreur(error instanceof Error ? error.message : 'Le cahier journal n’a pas pu être régénéré.')
      }
    })
  }

  function commencerEdition(jourIndex: number, seanceIndex: number) {
    if (!journal) return
    setErreur('')
    setEdition({ jourIndex, seanceIndex })
    setBrouillon({ ...journal[jourIndex].seances[seanceIndex] })
  }

  function annulerEdition() {
    setEdition(null)
    setBrouillon(null)
    setErreur('')
  }

  function enregistrerEdition() {
    if (!journal || !edition || !brouillon) return
    setErreur('')

    let suivant: JourJournal[]
    try {
      suivant = modifierSeanceJournal(
        journal,
        edition.jourIndex,
        edition.seanceIndex,
        brouillon,
      )
    } catch (error) {
      setErreur(error instanceof Error ? error.message : 'Cette entrée est invalide.')
      return
    }

    startTransition(async () => {
      try {
        await sauvegarderJournal(semaineId, suivant)
        setJournal(suivant)
        setEdition(null)
        setBrouillon(null)
        afficherSauvegarde()
      } catch (error) {
        setErreur(error instanceof Error ? error.message : 'Les modifications n’ont pas été enregistrées.')
      }
    })
  }

  function supprimerSeance(jourIndex: number, seanceIndex: number) {
    if (!journal) return
    const seance = journal[jourIndex].seances[seanceIndex]
    if (!confirm(
      `Supprimer l’entrée « ${seance.matiere} » de ce cahier journal ? `
      + 'Les autres entrées seront conservées.',
    )) return

    const suivant = supprimerSeanceJournal(journal, jourIndex, seanceIndex)
    setErreur('')
    startTransition(async () => {
      try {
        await sauvegarderJournal(semaineId, suivant)
        setJournal(suivant)
        if (edition?.jourIndex === jourIndex && edition.seanceIndex === seanceIndex) {
          setEdition(null)
          setBrouillon(null)
        }
        afficherSauvegarde()
      } catch (error) {
        setErreur(error instanceof Error ? error.message : 'L’entrée n’a pas pu être supprimée.')
      }
    })
  }

  if (!journal) {
    return (
      <div className="bg-white border rounded-2xl p-5 text-center shadow-sm">
        <h2 className="font-bold text-gray-700 mb-3">📋 Cahier journal</h2>
        <Bouton
          type="button"
          variant="principal"
          size="lg"
          icon={NotebookPen}
          loading={isPending}
          onClick={generer}
        >
          Générer le cahier journal
        </Bouton>
        {erreur && <p role="alert" className="mt-3 text-sm text-red-700">{erreur}</p>}
      </div>
    )
  }

  return (
    <div
      ref={journalRef}
      className="bg-white border rounded-2xl p-5 space-y-6 shadow-sm border-l-4 border-l-violet-400"
    >
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-gray-700">📋 Cahier journal</h2>
          {isPending && <span className="text-xs text-gray-400">Enregistrement...</span>}
          {saved && !isPending && <span className="text-xs text-green-600">✓ Sauvegardé</span>}
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <Bouton
            type="button"
            variant="neutre"
            size="sm"
            icon={RefreshCw}
            onClick={regenerer}
            loading={isPending}
            title="Recrée le cahier journal à partir de ton emploi du temps et de tes méthodes. Le contenu actuel de la semaine sera remplacé après confirmation."
            className="text-sm"
          >
            Régénérer
          </Bouton>
          <Bouton
            type="button"
            variant="contour"
            size="sm"
            icon={FileDown}
            onClick={handleExportWord}
            disabled={!journal}
            loading={exporting}
            title="Télécharge un document Word (.docx). Ouvre-le avec Word ou importe-le dans Google Docs."
            className="text-sm"
          >
            Word (.docx)
          </Bouton>
          <GoogleDocsButton journal={journal} numeroSemaine={numeroSemaine} />
          <Bouton
            type="button"
            variant="neutre"
            size="sm"
            icon={Printer}
            onClick={() => imprimerElement(journalRef.current)}
            className="text-sm"
          >
            PDF
          </Bouton>
        </div>
      </div>

      <p className="text-xs text-gray-500 -mt-3 no-print">
        Modifie ou supprime une entrée. Seule l’entrée choisie change et les autres contenus restent conservés.
      </p>

      {erreur && (
        <p role="alert" className="no-print -mt-2 text-sm bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2">
          {erreur}
        </p>
      )}

      {exported && (
        <div className="no-print -mt-2 text-sm bg-green-50 border border-green-200 text-green-800 rounded-lg px-3 py-2">
          ✓ Document <strong>cahier-journal-semaine-{numeroSemaine}.docx</strong> téléchargé dans « Téléchargements ».
          Ouvre-le avec Word ou importe-le dans Google Docs.
        </div>
      )}

      {journal.map((jour, jourIndex) => (
        <div key={jour.jour} className="border rounded-xl overflow-hidden print-section">
          <div className="bg-violet-50 px-4 py-2 font-semibold text-violet-800 capitalize">
            {jour.jour}
          </div>
          {jour.seances.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">Aucune entrée pour cette journée.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-violet-50/50 text-violet-700">
                    <th className="border-b p-2 text-left w-32">Horaires</th>
                    <th className="border-b p-2 text-left w-40">Matière</th>
                    <th className="border-b p-2 text-left">Déroulement</th>
                    <th className="border-b p-2 text-right w-44 no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jour.seances.map((seance, seanceIndex) => {
                    const estEditee = edition?.jourIndex === jourIndex
                      && edition.seanceIndex === seanceIndex

                    return (
                      <tr
                        key={`${seance.heure_debut}-${seance.heure_fin}-${seanceIndex}`}
                        className={seance.type === 'routine' ? 'bg-gray-50 text-gray-500 italic' : ''}
                      >
                        {estEditee && brouillon ? (
                          <>
                            <td className="border-b p-2 align-top">
                              <div className="flex items-center gap-1">
                                <label className="sr-only" htmlFor={`debut-${jourIndex}-${seanceIndex}`}>
                                  Heure de début
                                </label>
                                <input
                                  id={`debut-${jourIndex}-${seanceIndex}`}
                                  aria-label="Heure de début"
                                  type="time"
                                  value={heureSansSecondes(brouillon.heure_debut)}
                                  onChange={event => setBrouillon({
                                    ...brouillon,
                                    heure_debut: event.target.value,
                                  })}
                                  className="w-[5.5rem] border rounded-lg p-2 text-xs text-gray-900 bg-white"
                                />
                                <span>à</span>
                                <label className="sr-only" htmlFor={`fin-${jourIndex}-${seanceIndex}`}>
                                  Heure de fin
                                </label>
                                <input
                                  id={`fin-${jourIndex}-${seanceIndex}`}
                                  aria-label="Heure de fin"
                                  type="time"
                                  value={heureSansSecondes(brouillon.heure_fin)}
                                  onChange={event => setBrouillon({
                                    ...brouillon,
                                    heure_fin: event.target.value,
                                  })}
                                  className="w-[5.5rem] border rounded-lg p-2 text-xs text-gray-900 bg-white"
                                />
                              </div>
                            </td>
                            <td className="border-b p-2 align-top">
                              <label className="sr-only" htmlFor={`matiere-${jourIndex}-${seanceIndex}`}>
                                Matière
                              </label>
                              <input
                                id={`matiere-${jourIndex}-${seanceIndex}`}
                                aria-label="Matière"
                                value={brouillon.matiere}
                                onChange={event => setBrouillon({
                                  ...brouillon,
                                  matiere: event.target.value,
                                })}
                                className="w-full min-w-36 border rounded-lg p-2 text-sm text-gray-900 bg-white"
                              />
                            </td>
                            <td className="border-b p-2 align-top">
                              {brouillon.type === 'routine' ? (
                                <span className="text-xs">Aucun déroulement pour une routine.</span>
                              ) : (
                                <>
                                  <label className="sr-only" htmlFor={`deroulement-${jourIndex}-${seanceIndex}`}>
                                    Déroulement
                                  </label>
                                  <textarea
                                    id={`deroulement-${jourIndex}-${seanceIndex}`}
                                    aria-label="Déroulement"
                                    value={brouillon.deroulement}
                                    placeholder="À compléter"
                                    onChange={event => setBrouillon({
                                      ...brouillon,
                                      deroulement: event.target.value,
                                    })}
                                    rows={Math.max(2, brouillon.deroulement.split('\n').length)}
                                    className="w-full min-w-52 border rounded-lg p-2 text-sm text-gray-900 bg-white resize-y"
                                  />
                                </>
                              )}
                            </td>
                            <td className="border-b p-2 align-top no-print">
                              <div className="flex justify-end gap-2">
                                <Bouton
                                  type="button"
                                  variant="secondaire"
                                  size="sm"
                                  icon={Save}
                                  onClick={enregistrerEdition}
                                  loading={isPending}
                                  aria-label="Enregistrer les modifications"
                                >
                                  Enregistrer
                                </Bouton>
                                <Bouton
                                  type="button"
                                  variant="neutre"
                                  size="sm"
                                  icon={X}
                                  onClick={annulerEdition}
                                  disabled={isPending}
                                  aria-label="Annuler les modifications"
                                >
                                  Annuler
                                </Bouton>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="border-b p-2 align-top whitespace-nowrap text-xs text-gray-500">
                              {heureSansSecondes(seance.heure_debut)} à {heureSansSecondes(seance.heure_fin)}
                            </td>
                            <td className="border-b p-2 align-top font-medium text-gray-700">
                              {seance.matiere}
                            </td>
                            <td className="border-b p-2 align-top whitespace-pre-wrap text-gray-700">
                              {seance.type === 'routine'
                                ? <span className="text-xs">Routine, sans déroulement</span>
                                : seance.deroulement || <span className="text-gray-400">À compléter</span>}
                            </td>
                            <td className="border-b p-2 align-top no-print">
                              <div className="flex justify-end gap-2">
                                <Bouton
                                  type="button"
                                  variant="contour"
                                  size="sm"
                                  icon={Pencil}
                                  onClick={() => commencerEdition(jourIndex, seanceIndex)}
                                  disabled={isPending}
                                  aria-label={`Modifier ${seance.matiere}`}
                                >
                                  Modifier
                                </Bouton>
                                <Bouton
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  icon={Trash2}
                                  onClick={() => supprimerSeance(jourIndex, seanceIndex)}
                                  disabled={isPending}
                                  aria-label={`Supprimer ${seance.matiere}`}
                                >
                                  Supprimer
                                </Bouton>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
