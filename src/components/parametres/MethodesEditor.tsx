'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, FilePlus2, Save, Trash2 } from 'lucide-react'
import SourceImporter from '@/components/methodes/SourceImporter'
import Bouton from '@/components/ui/Bouton'
import {
  ajouterSourceProgression,
  retirerSourceProgression,
} from '@/lib/actions/methode-sources'
import { updateSuiviActif, lierCreneaux } from '@/lib/actions/methodes'
import { libelleMatiereCanonique } from '@/lib/matieres'
import NomMethodeEditor from '@/components/parametres/NomMethodeEditor'
import type { Methode, MethodeSource } from '@/types'
import type { SourceProgression } from '@/lib/progression-sources'

type CreneauInfo = {
  id: string
  matiere: string
  jour: string
  methode_id: string | null
}

type Message = {
  type: 'succes' | 'erreur'
  texte: string
}

const LIBELLES_TYPE: Record<MethodeSource['type_document'], string> = {
  manuel: 'Manuel ou sommaire',
  programmation: 'Programmation annuelle',
  periode: 'Planning de période',
}

export default function MethodesEditor({
  prenom,
  methodes,
  sources,
  creneaux,
  resumes,
}: {
  prenom?: string
  methodes: Methode[]
  sources: MethodeSource[]
  creneaux: CreneauInfo[]
  resumes?: Record<string, { semaines: number; notions: number }>
}) {
  const [importOuvert, setImportOuvert] = useState<string | 'nouvelle' | null>(null)
  const [lienOuvert, setLienOuvert] = useState<string | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const [ajoutEnCours, setAjoutEnCours] = useState(false)
  const [retraitEnCours, setRetraitEnCours] = useState<string | null>(null)
  const ajoutRef = useRef(false)
  const retraitRef = useRef<string | null>(null)
  const [liaisonEnCours, startLiaison] = useTransition()
  const router = useRouter()

  const [creneauxSelectionnes, setCreneauxSelectionnes] = useState<
    Record<string, Set<string>>
  >(() => {
    const init: Record<string, Set<string>> = {}
    for (const methode of methodes) {
      init[methode.id] = new Set(
        creneaux
          .filter(creneau => creneau.methode_id === methode.id)
          .map(creneau => creneau.id),
      )
    }
    return init
  })

  function selectionMethode(methodeId: string): Set<string> {
    return creneauxSelectionnes[methodeId]
      ?? new Set(
        creneaux
          .filter(creneau => creneau.methode_id === methodeId)
          .map(creneau => creneau.id),
      )
  }

  function toggleCreneau(methodeId: string, creneauId: string) {
    setCreneauxSelectionnes(precedent => {
      const selection = new Set(
        precedent[methodeId]
          ?? creneaux
            .filter(creneau => creneau.methode_id === methodeId)
            .map(creneau => creneau.id),
      )
      if (selection.has(creneauId)) selection.delete(creneauId)
      else selection.add(creneauId)
      return { ...precedent, [methodeId]: selection }
    })
  }

  async function ajouter(source: SourceProgression) {
    if (ajoutRef.current) return
    ajoutRef.current = true
    setAjoutEnCours(true)
    setMessage(null)
    try {
      await ajouterSourceProgression(source)
      setMessage({
        type: 'succes',
        texte: `Document ajouté : ${source.nomSource}`,
      })
      router.refresh()
    } catch (error) {
      const texte = error instanceof Error ? error.message : String(error)
      setMessage({ type: 'erreur', texte })
      throw error
    } finally {
      ajoutRef.current = false
      setAjoutEnCours(false)
    }
  }

  async function retirer(source: MethodeSource) {
    if (retraitRef.current) return
    const confirme = window.confirm(
      `Retirer « ${source.nom_source} » et recalculer la progression ?`,
    )
    if (!confirme) return

    retraitRef.current = source.id
    setRetraitEnCours(source.id)
    setMessage(null)
    try {
      await retirerSourceProgression(source.id)
      setMessage({
        type: 'succes',
        texte: `Document retiré : ${source.nom_source}`,
      })
      router.refresh()
    } catch (error) {
      setMessage({
        type: 'erreur',
        texte: error instanceof Error ? error.message : String(error),
      })
    } finally {
      retraitRef.current = null
      setRetraitEnCours(null)
    }
  }

  function enregistrerLiaisons(methodeId: string) {
    startLiaison(async () => {
      try {
        await lierCreneaux(methodeId, [...selectionMethode(methodeId)])
        setMessage({ type: 'succes', texte: 'Créneaux liés.' })
        setLienOuvert(null)
        router.refresh()
      } catch (error) {
        setMessage({
          type: 'erreur',
          texte: error instanceof Error ? error.message : String(error),
        })
      }
    })
  }

  function toggleSuivi(methodeId: string, actif: boolean) {
    startLiaison(async () => {
      try {
        await updateSuiviActif(methodeId, !actif)
        router.refresh()
      } catch (error) {
        setMessage({
          type: 'erreur',
          texte: error instanceof Error ? error.message : String(error),
        })
      }
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 bg-violet-50 border border-violet-100 rounded-lg p-3 leading-relaxed">
        Ajoute ici les documents de chaque méthode. Un planning de période plus précis
        remplace seulement la période concernée, sans effacer les autres matières.
        Le suivi des acquis et les créneaux liés restent réglables séparément.
      </p>

      {message && (
        <p
          role={message.type === 'erreur' ? 'alert' : 'status'}
          className={`rounded-lg border px-3 py-2 text-sm ${
            message.type === 'erreur'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {message.texte}
        </p>
      )}

      {methodes.length === 0 && (
        <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/50 p-4">
          <p className="font-medium text-slate-800">
            Aucune méthode n’est encore configurée.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Ajoute ton premier document. La matière et la méthode seront créées après
            ta vérification.
          </p>
          <Bouton
            type="button"
            variant="principal"
            size="sm"
            icon={FilePlus2}
            className="mt-3"
            onClick={() => setImportOuvert(
              importOuvert === 'nouvelle' ? null : 'nouvelle',
            )}
          >
            Ajouter un document ou une méthode
          </Bouton>
        </div>
      )}

      {methodes.map(methode => {
        const selection = selectionMethode(methode.id)
        const creneauxLies = creneaux.filter(creneau => selection.has(creneau.id))
        const sourcesMethode = sources.filter(
          source => source.methode_id === methode.id,
        )
        const importActif = importOuvert === methode.id

        return (
          <article key={methode.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">
                  {libelleMatiereCanonique(methode.matiere)}
                </p>
                <div className="mt-0.5">
                  <NomMethodeEditor methodeId={methode.id} nom={methode.manuel} />
                </div>
                {resumes?.[methode.id]?.semaines ? (
                  <p className="mt-1 text-xs text-violet-700">
                    {resumes[methode.id].semaines} semaine(s),{' '}
                    {resumes[methode.id].notions} notion(s)
                  </p>
                ) : null}
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={methode.suivi_actif}
                  onChange={() => toggleSuivi(methode.id, methode.suivi_actif)}
                  disabled={liaisonEnCours}
                  className="accent-violet-600"
                />
                Suivre les acquis des élèves
              </label>
            </div>

            <div className="mt-4 space-y-2" aria-label={`Documents de ${methode.manuel ?? methode.matiere}`}>
              {sourcesMethode.length === 0 && (
                <p className="text-sm text-slate-500">Aucun document enregistré.</p>
              )}
              {sourcesMethode.map(source => (
                <div
                  key={source.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {source.nom_source}
                    </p>
                    <p className="text-xs text-slate-500">
                      {LIBELLES_TYPE[source.type_document]}
                      {source.periode_numero ? ` · Période ${source.periode_numero}` : ''}
                    </p>
                  </div>
                  <Bouton
                    type="button"
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    aria-label={`Retirer ${source.nom_source}`}
                    loading={retraitEnCours === source.id}
                    disabled={retraitEnCours !== null}
                    onClick={() => void retirer(source)}
                  >
                    Retirer
                  </Bouton>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Bouton
                type="button"
                variant="contour"
                size="sm"
                icon={FilePlus2}
                disabled={ajoutEnCours}
                onClick={() => setImportOuvert(importActif ? null : methode.id)}
              >
                {importActif ? 'Fermer l’import' : 'Ajouter un document'}
              </Bouton>
              <Bouton
                type="button"
                variant="neutre"
                size="sm"
                icon={CalendarDays}
                onClick={() => setLienOuvert(
                  lienOuvert === methode.id ? null : methode.id,
                )}
              >
                {creneauxLies.length
                  ? `${creneauxLies.length} créneau(x) lié(s)`
                  : 'Choisir les créneaux'}
              </Bouton>
            </div>

            {lienOuvert === methode.id && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="mb-2 text-xs text-slate-500">
                  Coche les créneaux alimentés par cette méthode.
                </p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {creneaux.map(creneau => (
                    <label
                      key={creneau.id}
                      className="flex items-center gap-2 text-xs text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selection.has(creneau.id)}
                        onChange={() => toggleCreneau(methode.id, creneau.id)}
                        className="accent-violet-600"
                      />
                      {creneau.jour} : {creneau.matiere}
                    </label>
                  ))}
                  {creneaux.length === 0 && (
                    <p className="text-xs text-slate-400">
                      Aucun créneau dans l’emploi du temps.
                    </p>
                  )}
                </div>
                <Bouton
                  type="button"
                  variant="secondaire"
                  size="sm"
                  icon={Save}
                  className="mt-2"
                  loading={liaisonEnCours}
                  onClick={() => enregistrerLiaisons(methode.id)}
                >
                  Enregistrer les créneaux liés
                </Bouton>
              </div>
            )}

            {importActif && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <SourceImporter
                  prenom={prenom}
                  matiereInitiale={methode.matiere}
                  methodeInitiale={methode.manuel ?? ''}
                  onSourceReady={ajouter}
                  onCancel={() => setImportOuvert(null)}
                />
              </div>
            )}
          </article>
        )
      })}

      {importOuvert === 'nouvelle' && (
        <div className="rounded-xl border border-violet-200 bg-white p-4">
          <SourceImporter
            prenom={prenom}
            onSourceReady={ajouter}
            onCancel={() => setImportOuvert(null)}
          />
        </div>
      )}

      {methodes.length > 0 && (
        <Bouton
          type="button"
          variant="contour"
          size="sm"
          icon={FilePlus2}
          onClick={() => setImportOuvert(
            importOuvert === 'nouvelle' ? null : 'nouvelle',
          )}
        >
          Ajouter un document ou une méthode
        </Bouton>
      )}
    </div>
  )
}
