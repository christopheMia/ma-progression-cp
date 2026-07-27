'use client'

import { Fragment, useEffect, useRef, useState, useTransition } from 'react'
import { Check, FileDown, Pencil, Plus, Printer, Sparkles, Trash2, X } from 'lucide-react'
import type {
  Acquisition,
  AcquisitionCritere,
  Appreciation,
  CritereObservation,
  Eleve,
  Semaine,
} from '@/types'
import { toggleAcquisition } from '@/lib/actions/semaine'
import { upsertAppreciation } from '@/lib/actions/appreciation'
import {
  ajouterCritereObservation,
  definirAcquisitionCritere,
  modifierCritereObservation,
  supprimerCritereObservation,
} from '@/lib/actions/criteres-observation'
import { cleObservation } from '@/lib/criteres-observation'
import { agregerClasse, type StatutCase } from '@/lib/vue-classe'
import { exporterSuiviWord } from '@/lib/export-word'
import { imprimerElement } from '@/lib/print'
import { celebrate } from '@/lib/confetti'
import Bouton from '@/components/ui/Bouton'

type ApprState = { statut: string | null; commentaire: string }
type Methode = { methode_id: string; matiere: string; items: string[]; suivi_actif: boolean }
type ValeurObservation = boolean | null

function emojiMatiere(matiere: string) {
  return matiere === 'francais' ? '📖' : matiere === 'maths' ? '🔢' : '📋'
}

function labelMatiere(matiere: string) {
  return matiere === 'francais'
    ? 'Français'
    : matiere === 'maths'
      ? 'Maths'
      : matiere.charAt(0).toUpperCase() + matiere.slice(1)
}

// Couleurs de la vue d'ensemble. Trois etats lisibles de loin, plus le gris du
// « pas encore renseigne » qui ne doit pas ressembler a un echec.
const COULEURS_STATUT: Record<StatutCase, { pastille: string; case_: string }> = {
  vide: { pastille: 'bg-slate-300', case_: 'bg-slate-50 text-slate-400' },
  aucun: { pastille: 'bg-red-500', case_: 'bg-red-50 text-red-800' },
  partiel: { pastille: 'bg-amber-500', case_: 'bg-amber-50 text-amber-900' },
  complet: { pastille: 'bg-emerald-500', case_: 'bg-emerald-50 text-emerald-900' },
}

const LIBELLES_STATUT: Record<StatutCase, string> = {
  vide: 'pas encore renseigné',
  aucun: 'rien acquis',
  partiel: 'en cours',
  complet: 'tout acquis',
}

const cleAppreciation = (eleveId: string, matiere: string) => `${eleveId}|${matiere}`
const cleNotion = (eleveId: string, matiere: string, notion: string) =>
  `${eleveId}|${matiere}|${notion}`
const cleFormulaire = (matiere: string, notion: string) => `${matiere}|${notion}`

function BoutonsAcquisition({
  valeur,
  onChange,
  disabled,
  libelle,
}: {
  valeur: ValeurObservation
  onChange: (valeur: boolean) => void
  disabled: boolean
  libelle: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        aria-label={`${libelle} : acquis`}
        aria-pressed={valeur === true}
        disabled={disabled}
        onClick={() => onChange(true)}
        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
          valeur === true
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50'
        }`}
      >
        Acquis
      </button>
      <button
        type="button"
        aria-label={`${libelle} : non acquis`}
        aria-pressed={valeur === false}
        disabled={disabled}
        onClick={() => onChange(false)}
        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
          valeur === false
            ? 'border-amber-600 bg-amber-600 text-white'
            : 'border-amber-200 bg-white text-amber-800 hover:bg-amber-50'
        }`}
      >
        Non acquis
      </button>
    </div>
  )
}

export default function StudentTracking({
  semaine,
  eleves,
  acquisitions,
  appreciations,
  methodes,
  criteresObservation,
  acquisitionsCriteres,
}: {
  semaine: Semaine
  eleves: Eleve[]
  acquisitions: Acquisition[]
  appreciations: Appreciation[]
  methodes: Methode[]
  criteresObservation: CritereObservation[]
  acquisitionsCriteres: AcquisitionCritere[]
}) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [bilanLoading, setBilanLoading] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [erreur, setErreur] = useState('')
  const [criteres, setCriteres] = useState(criteresObservation)
  const [nouveauxCriteres, setNouveauxCriteres] = useState<Record<string, string>>({})
  const [notionsDepliees, setNotionsDepliees] = useState<Record<string, boolean>>({})
  const [critereEdite, setCritereEdite] = useState<string | null>(null)
  const [libelleEdite, setLibelleEdite] = useState('')
  const [eleveDeplie, setEleveDeplie] = useState<string | null>(null)
  const wasPending = useRef(false)
  const blocRef = useRef<HTMLDivElement>(null)

  const [acquisNotions, setAcquisNotions] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const acquisition of acquisitions) {
      init[cleNotion(acquisition.eleve_id, acquisition.matiere, acquisition.grapheme)] = acquisition.acquis
    }
    return init
  })

  const [acquisCriteres, setAcquisCriteres] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const acquisition of acquisitionsCriteres) {
      init[cleObservation(acquisition.eleve_id, acquisition.critere_id)] = acquisition.acquis
    }
    return init
  })

  const [appr, setAppr] = useState<Record<string, ApprState>>(() => {
    const init: Record<string, ApprState> = {}
    for (const appreciation of appreciations) {
      init[cleAppreciation(appreciation.eleve_id, appreciation.matiere)] = {
        statut: appreciation.statut,
        commentaire: appreciation.commentaire ?? '',
      }
    }
    return init
  })

  useEffect(() => {
    if (wasPending.current && !isPending) {
      setSaved(true)
      const timer = setTimeout(() => setSaved(false), 2000)
      return () => clearTimeout(timer)
    }
    wasPending.current = isPending
  }, [isPending])

  function getAppr(eleveId: string, matiere: string): ApprState {
    return appr[cleAppreciation(eleveId, matiere)] ?? { statut: null, commentaire: '' }
  }

  function valeurNotion(eleveId: string, matiere: string, notion: string): ValeurObservation {
    const cle = cleNotion(eleveId, matiere, notion)
    return Object.hasOwn(acquisNotions, cle) ? acquisNotions[cle] : null
  }

  function valeurCritere(eleveId: string, critereId: string): ValeurObservation {
    const cle = cleObservation(eleveId, critereId)
    return Object.hasOwn(acquisCriteres, cle) ? acquisCriteres[cle] : null
  }

  function criteresPour(matiere: string, notion: string) {
    return criteres
      .filter(critere => critere.matiere === matiere && critere.notion === notion)
      .sort((a, b) => a.ordre - b.ordre)
  }

  function notionsPour(matiere: string, items: string[]) {
    const notions = new Set(items)
    for (const critere of criteres) {
      if (critere.matiere === matiere) notions.add(critere.notion)
    }
    for (const acquisition of acquisitions) {
      if (acquisition.matiere === matiere) notions.add(acquisition.grapheme)
    }
    return Array.from(notions)
  }

  function definirNotion(eleveId: string, matiere: string, notion: string, acquis: boolean) {
    const cle = cleNotion(eleveId, matiere, notion)
    const precedente = valeurNotion(eleveId, matiere, notion)
    setErreur('')
    setAcquisNotions(etat => ({ ...etat, [cle]: acquis }))

    startTransition(async () => {
      try {
        await toggleAcquisition(semaine.id, eleveId, matiere, notion, acquis)
        if (acquis && precedente !== true) celebrate()
      } catch (error) {
        setAcquisNotions(etat => {
          const suivant = { ...etat }
          if (precedente === null) delete suivant[cle]
          else suivant[cle] = precedente
          return suivant
        })
        setErreur(error instanceof Error ? error.message : 'Le suivi n’a pas pu être enregistré.')
      }
    })
  }

  function definirCritere(eleveId: string, critereId: string, acquis: boolean) {
    const cle = cleObservation(eleveId, critereId)
    const precedente = valeurCritere(eleveId, critereId)
    setErreur('')
    setAcquisCriteres(etat => ({ ...etat, [cle]: acquis }))

    startTransition(async () => {
      const r = await definirAcquisitionCritere(critereId, eleveId, acquis)
      if (!r.ok) {
        setAcquisCriteres(etat => {
          const suivant = { ...etat }
          if (precedente === null) delete suivant[cle]
          else suivant[cle] = precedente
          return suivant
        })
        setErreur(r.message)
      }
    })
  }

  function ajouterCritere(matiere: string, notion: string) {
    const cle = cleFormulaire(matiere, notion)
    const libelle = nouveauxCriteres[cle] ?? ''
    setErreur('')
    // Garde-fou avant l'aller-retour serveur : un champ vide se dit tout de
    // suite, sur place, plutot que de partir chercher une erreur au serveur.
    if (!libelle.trim()) {
      setErreur('Écris le critère que tu veux observer.')
      return
    }
    startTransition(async () => {
      const r = await ajouterCritereObservation(semaine.id, matiere, notion, libelle)
      if (!r.ok) {
        setErreur(r.message)
        return
      }
      setCriteres(etat => [...etat, r.valeur])
      setNouveauxCriteres(etat => ({ ...etat, [cle]: '' }))
    })
  }

  function commencerEditionCritere(critere: CritereObservation) {
    setCritereEdite(critere.id)
    setLibelleEdite(critere.libelle)
    setErreur('')
  }

  function enregistrerCritere() {
    if (!critereEdite) return
    setErreur('')
    if (!libelleEdite.trim()) {
      setErreur('Écris le critère que tu veux observer.')
      return
    }
    startTransition(async () => {
      const r = await modifierCritereObservation(critereEdite, libelleEdite)
      if (!r.ok) {
        setErreur(r.message)
        return
      }
      const modifie = r.valeur
      setCriteres(etat => etat.map(critere => critere.id === modifie.id ? modifie : critere))
      setCritereEdite(null)
      setLibelleEdite('')
    })
  }

  function supprimerCritere(critere: CritereObservation) {
    if (!confirm(
      `Supprimer le critère « ${critere.libelle} » ? `
      + 'Ses coches seront supprimées, mais les autres critères et suivis seront conservés.',
    )) return

    setErreur('')
    startTransition(async () => {
      const r = await supprimerCritereObservation(critere.id)
      if (!r.ok) {
        setErreur(r.message)
        return
      }
      setCriteres(etat => etat.filter(item => item.id !== critere.id))
      setAcquisCriteres(etat => Object.fromEntries(
        Object.entries(etat).filter(([cle]) => !cle.endsWith(`|${critere.id}`)),
      ))
    })
  }

  function handleStatut(eleveId: string, matiere: string, value: string) {
    const current = getAppr(eleveId, matiere)
    const statut = current.statut === value ? null : value
    const next = { ...current, statut }
    setAppr(etat => ({ ...etat, [cleAppreciation(eleveId, matiere)]: next }))
    startTransition(() =>
      upsertAppreciation(semaine.id, eleveId, matiere, statut, next.commentaire),
    )
  }

  function handleComment(eleveId: string, matiere: string, commentaire: string) {
    setAppr(etat => ({
      ...etat,
      [cleAppreciation(eleveId, matiere)]: { ...getAppr(eleveId, matiere), commentaire },
    }))
  }

  function saveComment(eleveId: string, matiere: string) {
    const appreciation = getAppr(eleveId, matiere)
    startTransition(() =>
      upsertAppreciation(
        semaine.id,
        eleveId,
        matiere,
        appreciation.statut,
        appreciation.commentaire,
      ),
    )
  }

  function observationsEleve(eleveId: string, matiere: string, items: string[]) {
    const observations: Array<{ libelle: string; valeur: ValeurObservation }> = []
    for (const notion of notionsPour(matiere, items)) {
      observations.push({
        libelle: notion,
        valeur: valeurNotion(eleveId, matiere, notion),
      })
      for (const critere of criteresPour(matiere, notion)) {
        observations.push({
          libelle: `${notion} : ${critere.libelle}`,
          valeur: valeurCritere(eleveId, critere.id),
        })
      }
    }
    return observations
  }

  async function generateBilan(eleve: Eleve, matiere: string, items: string[]) {
    const current = getAppr(eleve.id, matiere)
    const observations = observationsEleve(eleve.id, matiere, items)
    const itemsAcquis = observations.filter(item => item.valeur === true).map(item => item.libelle)
    const itemsNonAcquis = observations.filter(item => item.valeur === false).map(item => item.libelle)
    setBilanLoading(cleAppreciation(eleve.id, matiere))
    try {
      const response = await fetch('/api/ia-bilan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroSemaine: semaine.numero,
          matiere,
          itemsAcquis,
          itemsNonAcquis,
          statut: current.statut,
        }),
      })
      const data = await response.json()
      if (response.ok && typeof data.bilan === 'string') {
        const texte = data.bilan.replaceAll('[ELEVE]', eleve.prenom)
        setAppr(etat => ({
          ...etat,
          [cleAppreciation(eleve.id, matiere)]: { ...current, commentaire: texte },
        }))
        startTransition(() =>
          upsertAppreciation(semaine.id, eleve.id, matiere, current.statut, texte),
        )
      } else {
        alert(data.error ?? 'Erreur lors de la génération du bilan.')
      }
    } catch {
      alert('Erreur réseau lors de la génération du bilan.')
    } finally {
      setBilanLoading(null)
    }
  }

  function statutLabel(statut: string | null) {
    return statut === 'acquis' ? 'Acquis' : statut === 'pas_acquis' ? 'Pas encore' : ''
  }

  function exportWord(matiere: string, items: string[]) {
    const premiereLigne = eleves[0]
      ? observationsEleve(eleves[0].id, matiere, items).map(item => item.libelle)
      : notionsPour(matiere, items).flatMap(notion => [
        notion,
        ...criteresPour(matiere, notion).map(critere => `${notion} : ${critere.libelle}`),
      ])

    exporterSuiviWord({
      numeroSemaine: semaine.numero,
      observations: premiereLigne,
      lignes: eleves.map(eleve => {
        const observations = observationsEleve(eleve.id, matiere, items)
        const acquis = observations.filter(item => item.valeur === true).length
        return {
          prenom: eleve.prenom,
          acquis: observations.map(item => item.valeur),
          progres: `${acquis}/${observations.length}`,
          bilan: statutLabel(getAppr(eleve.id, matiere).statut),
          commentaire: getAppr(eleve.id, matiere).commentaire,
        }
      }),
    })
  }

  const methodesActives = methodes.filter(methode => methode.suivi_actif)

  // Toutes les notions de la semaine, toutes matieres confondues, dans l'ordre
  // d'affichage des matieres. C'est l'axe des colonnes de la vue d'ensemble.
  const toutesLesNotions = methodesActives.flatMap(({ matiere, items }) =>
    notionsPour(matiere, items).map(notion => ({ matiere, notion })),
  )

  const lignesClasse = agregerClasse({
    eleves,
    notions: toutesLesNotions,
    criteres,
    valeurCritere,
    valeurNotion,
  })

  return (
    <div ref={blocRef} className="bg-white border rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <button
          type="button"
          onClick={() => setOpen(etat => !etat)}
          aria-expanded={open}
          className="flex items-center gap-2 group"
        >
          <h2 className="font-bold text-gray-700 group-hover:text-violet-700">
            Suivi des élèves
          </h2>
          <span className="flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-100 rounded-full px-3 py-1">
            <span aria-hidden>{open ? '▾' : '▸'}</span>
            {open ? 'Replier' : 'Déplier'}
          </span>
        </button>
        {isPending && <span className="text-xs text-gray-500">Enregistrement...</span>}
        {saved && !isPending && <span className="text-xs text-green-700">Enregistré</span>}
        {open && (
          <Bouton
            type="button"
            variant="neutre"
            size="sm"
            icon={Printer}
            onClick={() => imprimerElement(blocRef.current)}
            className="no-print ml-auto"
          >
            Imprimer
          </Bouton>
        )}
      </div>

      {!open && (
        <p className="text-xs text-gray-500">
          Ouvre le suivi pour définir tes critères et cocher chaque élève.
        </p>
      )}

      {open && (
        <div className="space-y-7">
          <p className="text-sm text-gray-600">
            Chaque notion conserve son suivi global. Tu peux ajouter les points précis que tu veux observer,
            puis choisir Acquis ou Non acquis pour chaque élève.
          </p>

          {erreur && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {erreur}
            </p>
          )}

          {toutesLesNotions.length > 0 && (
            <section className="rounded-2xl border border-violet-100 bg-white p-4">
              <h3 className="font-bold text-violet-800">👀 Ma classe d’un coup d’œil</h3>
              <p className="mt-1 text-sm text-gray-600">
                Clique sur un élève pour déplier son détail. Le chiffre indique les points
                observés qui sont acquis.
              </p>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-max border-separate border-spacing-1 text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-white px-2 py-1 text-left text-xs font-semibold text-gray-500">
                        Élève
                      </th>
                      {toutesLesNotions.map(({ matiere, notion }) => (
                        <th
                          key={`${matiere}|${notion}`}
                          scope="col"
                          className="max-w-28 px-2 py-1 text-left align-bottom text-xs font-semibold text-gray-700"
                        >
                          <span className="line-clamp-2 break-words">
                            {emojiMatiere(matiere)} {notion}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lignesClasse.map(ligne => {
                      const deplie = eleveDeplie === ligne.eleveId
                      return (
                        <Fragment key={ligne.eleveId}>
                          <tr>
                            <th scope="row" className="sticky left-0 bg-white p-0 text-left font-normal">
                              <button
                                type="button"
                                onClick={() => setEleveDeplie(deplie ? null : ligne.eleveId)}
                                aria-expanded={deplie}
                                className="w-full rounded-lg px-2 py-1 text-left font-semibold text-gray-900 hover:bg-violet-50"
                              >
                                {deplie ? '▾' : '▸'} {ligne.prenom}
                              </button>
                            </th>
                            {ligne.cases.map(c => (
                              <td key={`${c.matiere}|${c.notion}`} className="p-0">
                                <span
                                  className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${COULEURS_STATUT[c.statut].case_}`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${COULEURS_STATUT[c.statut].pastille}`}
                                  />
                                  <span className="sr-only">
                                    {ligne.prenom}, {c.notion} : {LIBELLES_STATUT[c.statut]},{' '}
                                  </span>
                                  {c.acquis}/{c.total}
                                </span>
                              </td>
                            ))}
                          </tr>
                          {deplie && (
                            <tr>
                              <td colSpan={toutesLesNotions.length + 1} className="p-0">
                                <div className="mb-1 rounded-xl bg-violet-50/60 p-3">
                                  <p className="mb-2 text-sm font-bold text-violet-900">
                                    Détail de {ligne.prenom}
                                  </p>
                                  <ul className="space-y-2">
                                    {ligne.cases.map(c => {
                                      const criteresNotion = criteresPour(c.matiere, c.notion)
                                      return (
                                        <li key={`${c.matiere}|${c.notion}`} className="text-sm">
                                          <span className="font-semibold text-gray-900">
                                            {emojiMatiere(c.matiere)} {c.notion}
                                          </span>{' '}
                                          <span className="text-gray-600">
                                            {c.acquis}/{c.total} ({LIBELLES_STATUT[c.statut]})
                                          </span>
                                          {criteresNotion.length > 0 && (
                                            <ul className="ml-4 mt-1 space-y-0.5 text-xs text-gray-700">
                                              {criteresNotion.map(critere => {
                                                const v = valeurCritere(ligne.eleveId, critere.id)
                                                return (
                                                  <li key={critere.id}>
                                                    {v === true ? '✓' : v === false ? '✗' : '–'}{' '}
                                                    {critere.libelle}
                                                  </li>
                                                )
                                              })}
                                            </ul>
                                          )}
                                        </li>
                                      )
                                    })}
                                  </ul>
                                  {/* gray-600 et pas gray-500 : sur le fond violet
                                      teinte, gray-500 tombe a 4,56:1, soit tout juste
                                      le minimum pour un texte de cette taille. */}
                                  <p className="mt-2 text-xs text-gray-600">
                                    Pour modifier, va dans le détail de la notion plus bas.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                {(['aucun', 'partiel', 'complet', 'vide'] as StatutCase[]).map(statut => (
                  <span key={statut} className="flex items-center gap-1">
                    <span className={`inline-block h-2 w-2 rounded-full ${COULEURS_STATUT[statut].pastille}`} />
                    {LIBELLES_STATUT[statut]}
                  </span>
                ))}
              </p>
            </section>
          )}

          {methodesActives.map(({ matiere, items }) => {
            const notions = notionsPour(matiere, items)
            return (
              <section
                key={matiere}
                id={`suivi-${matiere}`}
                className="space-y-5 scroll-mt-24"
              >
                <div className="flex flex-wrap items-center gap-3 border-b pb-3">
                  <h3 className="font-bold text-violet-800">
                    {emojiMatiere(matiere)} {labelMatiere(matiere)}
                  </h3>
                  <Bouton
                    type="button"
                    variant="contour"
                    size="sm"
                    icon={FileDown}
                    onClick={() => exportWord(matiere, items)}
                    className="no-print"
                  >
                    Word
                  </Bouton>
                </div>

                {notions.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-gray-600">
                    Aucune notion n’est renseignée pour cette semaine.
                  </p>
                ) : notions.map(notion => {
                  const criteresNotion = criteresPour(matiere, notion)
                  const cleForm = cleFormulaire(matiere, notion)
                  const titreDeplie = notionsDepliees[cleForm] ?? false
                  return (
                    <article key={notion} className="rounded-2xl border border-violet-100 bg-violet-50/30 p-4">
                      <div className="mb-4 min-w-0 rounded-xl bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Notion</p>
                        <h4
                          title={notion}
                          className={`max-w-full break-words text-base font-bold leading-6 text-gray-900 ${
                            titreDeplie ? '' : 'line-clamp-2'
                          }`}
                        >
                          {notion}
                        </h4>
                        {notion.length > 80 && (
                          <button
                            type="button"
                            onClick={() => setNotionsDepliees(etat => ({
                              ...etat,
                              [cleForm]: !titreDeplie,
                            }))}
                            aria-expanded={titreDeplie}
                            className="no-print mt-1 text-xs font-semibold text-violet-700 hover:underline"
                          >
                            {titreDeplie ? 'Réduire le titre' : 'Voir le titre complet'}
                          </button>
                        )}
                      </div>

                      <div className="no-print mb-4 rounded-xl border bg-white p-3">
                        {/* La notion est nommee A L ECRAN, pas seulement pour les
                            lecteurs d ecran : sans elle on ne sait pas a quoi se
                            rattache le critere qu on ecrit (retour du 27/07).
                            Pas d attribut `title` ici, le titre complet est deja
                            accessible par le bouton « Voir le titre complet ». */}
                        <p className="text-sm font-semibold text-gray-800">
                          Mes critères d’observation pour :
                        </p>
                        <p className="mb-2 line-clamp-1 text-sm font-bold text-violet-700">
                          {notion}
                        </p>
                        {criteresNotion.length === 0 ? (
                          <p className="mb-3 text-xs text-gray-500">
                            Aucun critère personnalisé pour le moment.
                          </p>
                        ) : (
                          <p className="mb-3 text-xs text-gray-500">
                            {criteresNotion.length === 1
                              ? '1 critère pour cette notion'
                              : `${criteresNotion.length} critères pour cette notion`}
                          </p>
                        )}
                        <div className="space-y-2">
                          {criteresNotion.map(critere => (
                            <div key={critere.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                              {critereEdite === critere.id ? (
                                <>
                                  <label className="sr-only" htmlFor={`critere-${critere.id}`}>
                                    Modifier le critère
                                  </label>
                                  <input
                                    id={`critere-${critere.id}`}
                                    value={libelleEdite}
                                    onChange={event => setLibelleEdite(event.target.value)}
                                    className="min-w-52 flex-1 rounded-lg border bg-white px-3 py-2 text-sm text-gray-900"
                                  />
                                  <Bouton
                                    type="button"
                                    variant="secondaire"
                                    size="sm"
                                    icon={Check}
                                    onClick={enregistrerCritere}
                                    loading={isPending}
                                    aria-label={`Enregistrer le critère ${critere.libelle}`}
                                  >
                                    Enregistrer
                                  </Bouton>
                                  <Bouton
                                    type="button"
                                    variant="neutre"
                                    size="sm"
                                    icon={X}
                                    onClick={() => setCritereEdite(null)}
                                    disabled={isPending}
                                    aria-label={`Annuler la modification de ${critere.libelle}`}
                                  >
                                    Annuler
                                  </Bouton>
                                </>
                              ) : (
                                <>
                                  <span className="min-w-52 flex-1 text-sm text-gray-800">{critere.libelle}</span>
                                  <Bouton
                                    type="button"
                                    variant="contour"
                                    size="sm"
                                    icon={Pencil}
                                    onClick={() => commencerEditionCritere(critere)}
                                    disabled={isPending}
                                    aria-label={`Modifier le critère ${critere.libelle}`}
                                  >
                                    Modifier
                                  </Bouton>
                                  <Bouton
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    icon={Trash2}
                                    onClick={() => supprimerCritere(critere)}
                                    disabled={isPending}
                                    aria-label={`Supprimer le critère ${critere.libelle}`}
                                  >
                                    Supprimer
                                  </Bouton>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <label
                            className="line-clamp-2 w-full text-xs font-semibold text-gray-700"
                            htmlFor={`nouveau-${cleForm}`}
                          >
                            Nouveau critère pour{' '}
                            <span className="text-violet-700">{notion}</span>
                          </label>
                          <input
                            id={`nouveau-${cleForm}`}
                            value={nouveauxCriteres[cleForm] ?? ''}
                            onChange={event => setNouveauxCriteres(etat => ({
                              ...etat,
                              [cleForm]: event.target.value,
                            }))}
                            onKeyDown={event => {
                              if (event.key === 'Enter') ajouterCritere(matiere, notion)
                            }}
                            placeholder="Exemple : explique sa démarche"
                            className="min-w-60 flex-1 rounded-lg border px-3 py-2 text-sm text-gray-900"
                          />
                          <Bouton
                            type="button"
                            variant="secondaire"
                            size="sm"
                            icon={Plus}
                            onClick={() => ajouterCritere(matiere, notion)}
                            loading={isPending}
                          >
                            Ajouter ce critère
                          </Bouton>
                        </div>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-2">
                        {eleves.map(eleve => (
                          <div key={eleve.id} className="rounded-xl border bg-white p-3">
                            <p className="mb-3 font-semibold text-gray-900">{eleve.prenom}</p>
                            <div className="space-y-3">
                              <div className="grid gap-2 border-b pb-3 sm:grid-cols-[1fr_auto] sm:items-center">
                                <div>
                                  <p className="text-sm font-medium text-gray-800">Notion dans son ensemble</p>
                                  <p className="text-xs text-gray-500">Suivi historique conservé</p>
                                </div>
                                <BoutonsAcquisition
                                  valeur={valeurNotion(eleve.id, matiere, notion)}
                                  onChange={valeur => definirNotion(eleve.id, matiere, notion, valeur)}
                                  disabled={isPending}
                                  libelle={`${eleve.prenom}, ${notion}, notion dans son ensemble`}
                                />
                              </div>
                              {criteresNotion.map(critere => (
                                <div key={critere.id} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                                  <p className="text-sm text-gray-700">{critere.libelle}</p>
                                  <BoutonsAcquisition
                                    valeur={valeurCritere(eleve.id, critere.id)}
                                    onChange={valeur => definirCritere(eleve.id, critere.id, valeur)}
                                    disabled={isPending}
                                    libelle={`${eleve.prenom}, ${notion}, ${critere.libelle}`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  )
                })}

                <div className="rounded-2xl border bg-slate-50 p-4">
                  <h4 className="mb-3 font-bold text-gray-800">Bilan et commentaire de la semaine</h4>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {eleves.map(eleve => {
                      const appreciation = getAppr(eleve.id, matiere)
                      return (
                        <div key={eleve.id} className="rounded-xl border bg-white p-3">
                          <p className="mb-2 font-semibold text-gray-900">{eleve.prenom}</p>
                          <div className="no-print mb-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleStatut(eleve.id, matiere, 'acquis')}
                              disabled={isPending}
                              aria-pressed={appreciation.statut === 'acquis'}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                appreciation.statut === 'acquis'
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-gray-300 text-gray-600'
                              }`}
                            >
                              Acquis
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatut(eleve.id, matiere, 'pas_acquis')}
                              disabled={isPending}
                              aria-pressed={appreciation.statut === 'pas_acquis'}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                appreciation.statut === 'pas_acquis'
                                  ? 'border-amber-600 bg-amber-600 text-white'
                                  : 'border-gray-300 text-gray-600'
                              }`}
                            >
                              Pas encore
                            </button>
                          </div>
                          <span className="print-only text-sm text-gray-800">
                            {statutLabel(appreciation.statut)}
                          </span>
                          <div className="no-print space-y-2">
                            <textarea
                              value={appreciation.commentaire}
                              onChange={event =>
                                handleComment(eleve.id, matiere, event.target.value)}
                              onBlur={() => saveComment(eleve.id, matiere)}
                              placeholder="Remarque libre"
                              rows={3}
                              className="w-full rounded-lg border p-2 text-sm text-gray-900"
                            />
                            <Bouton
                              type="button"
                              variant="contour"
                              size="sm"
                              icon={Sparkles}
                              onClick={() => generateBilan(eleve, matiere, items)}
                              loading={bilanLoading === cleAppreciation(eleve.id, matiere)}
                              disabled={isPending}
                              title="Le prénom reste dans le navigateur et n’est pas envoyé à l’IA."
                            >
                              Bilan IA
                            </Bouton>
                          </div>
                          <span className="print-only text-sm text-gray-800">
                            {appreciation.commentaire}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
