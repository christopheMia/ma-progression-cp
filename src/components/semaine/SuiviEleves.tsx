'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, Plus, Trash2 } from 'lucide-react'
import ChoixComportement, { TEINTE_COMPORTEMENT, Visage } from '@/components/ui/Visage'
import {
  LIBELLE_COMPORTEMENT,
  posturePour,
  resumerComportement,
  type EtatComportement,
} from '@/lib/comportement'
import {
  ajouterObservation,
  definirComportement,
  modifierObservation,
  supprimerObservation,
} from '@/lib/actions/suivi-libre'

export type EleveSuivi = { id: string; prenom: string }
export type SemainePeriode = { id: string; numero: number }
export type Observation = {
  id: string
  eleveId: string
  semaineId: string
  observeeLe: string
  texte: string
}

function enFrancais(iso: string) {
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

/**
 * Le suivi des élèves, en texte libre.
 *
 * Refait le 28/07/2026. Christophe : « le suivi des élèves doit se transformer
 * uniquement en zone de texte libre, avec possibilité de mettre la date avec
 * le calendrier, la liste des élèves doit être déroulante, avec un système à
 * code couleur qui dira comment s'est passée chaque semaine ».
 *
 * Fini les cases par notion et par critère. Un élève, une pastille de
 * comportement pour la semaine, et des observations datées.
 */
export default function SuiviEleves({
  semaineId,
  numeroSemaine,
  dateParDefaut,
  eleves,
  semainesPeriode,
  comportements: comportementsInitiaux,
  observations: observationsInitiales,
}: {
  semaineId: string
  numeroSemaine: number
  /** Le premier jour de la semaine : la date la plus probable d'une observation. */
  dateParDefaut: string
  eleves: EleveSuivi[]
  /** Les semaines de la période en cours, pour la frise. */
  semainesPeriode: SemainePeriode[]
  /** Clé `eleveId|semaineId`. */
  comportements: Record<string, EtatComportement>
  observations: Observation[]
}) {
  const [isPending, startTransition] = useTransition()
  const [erreur, setErreur] = useState('')
  const [iEleve, setIEleve] = useState(0)
  const [comportements, setComportements] = useState(comportementsInitiaux)
  const [observations, setObservations] = useState(observationsInitiales)
  const [dateSaisie, setDateSaisie] = useState(dateParDefaut)

  const eleve = eleves[iEleve]
  const cle = (eleveId: string, sId: string) => `${eleveId}|${sId}`

  if (!eleve) {
    return (
      <div className="rounded-2xl border bg-white p-5 text-sm text-gray-600">
        Aucun élève dans la classe pour l’instant.
      </div>
    )
  }

  const etatSemaine = comportements[cle(eleve.id, semaineId)] ?? null
  const etatsPeriode = semainesPeriode.map(s => comportements[cle(eleve.id, s.id)] ?? null)
  const resume = resumerComportement(etatsPeriode)
  const posture = posturePour(resume)

  const siennes = observations
    .filter(o => o.eleveId === eleve.id)
    .sort((a, b) => a.observeeLe.localeCompare(b.observeeLe))

  function poserComportement(etat: EtatComportement | null) {
    const precedent = etatSemaine
    setErreur('')
    setComportements(etatActuel => {
      const suivant = { ...etatActuel }
      if (etat === null) delete suivant[cle(eleve.id, semaineId)]
      else suivant[cle(eleve.id, semaineId)] = etat
      return suivant
    })

    startTransition(async () => {
      const r = await definirComportement(eleve.id, semaineId, etat)
      if (!r.ok) {
        setComportements(etatActuel => {
          const suivant = { ...etatActuel }
          if (precedent === null) delete suivant[cle(eleve.id, semaineId)]
          else suivant[cle(eleve.id, semaineId)] = precedent
          return suivant
        })
        setErreur(r.message)
      }
    })
  }

  function ajouter() {
    setErreur('')
    startTransition(async () => {
      const r = await ajouterObservation(eleve.id, semaineId, dateSaisie)
      if (!r.ok) {
        setErreur(r.message)
        return
      }
      setObservations(liste => [...liste, {
        id: r.valeur, eleveId: eleve.id, semaineId, observeeLe: dateSaisie, texte: '',
      }])
    })
  }

  function modifier(id: string, changement: Partial<Observation>) {
    const suivant = observations.map(o => (o.id === id ? { ...o, ...changement } : o))
    setObservations(suivant)
    const observation = suivant.find(o => o.id === id)
    if (!observation) return

    startTransition(async () => {
      const r = await modifierObservation(id, observation.texte, observation.observeeLe)
      if (!r.ok) setErreur(r.message)
    })
  }

  function retirer(id: string) {
    const avant = observations
    setObservations(liste => liste.filter(o => o.id !== id))
    startTransition(async () => {
      const r = await supprimerObservation(id)
      if (!r.ok) {
        setObservations(avant)
        setErreur(r.message)
      }
    })
  }

  return (
    <div className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-bold text-gray-700">Suivi des élèves</h2>
        <label className="text-sm font-semibold text-gray-800">
          <span className="sr-only">Élève</span>
          <select
            value={iEleve}
            onChange={e => setIEleve(Number(e.target.value))}
            aria-label="Élève"
            className="rounded-lg border px-2 py-1 font-semibold text-gray-900"
          >
            {eleves.map((e, i) => <option key={e.id} value={i}>{e.prenom}</option>)}
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setIEleve((iEleve - 1 + eleves.length) % eleves.length)}
            className="rounded-lg border px-2 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-50"
          >
            ← {eleves[(iEleve - 1 + eleves.length) % eleves.length].prenom}
          </button>
          <button
            type="button"
            onClick={() => setIEleve((iEleve + 1) % eleves.length)}
            className="rounded-lg border px-2 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-50"
          >
            {eleves[(iEleve + 1) % eleves.length].prenom} →
          </button>
        </div>
      </div>

      {isPending && <p className="text-xs text-gray-500">Enregistrement...</p>}
      {erreur && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erreur}
        </p>
      )}

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
          Comment s’est passée la semaine {numeroSemaine}
        </h3>
        <ChoixComportement
          valeur={etatSemaine}
          onChange={poserComportement}
          disabled={isPending}
          libelle={`${eleve.prenom}, semaine ${numeroSemaine}`}
        />
      </section>

      {semainesPeriode.length > 0 && (
        <section className="border-t pt-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            La période d’un coup d’œil
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {semainesPeriode.map(s => {
              const etat = comportements[cle(eleve.id, s.id)] ?? null
              const dit = etat
                ? `Semaine ${s.numero} : ${LIBELLE_COMPORTEMENT[etat]}`
                : `Semaine ${s.numero} : rien de noté`
              return (
                <span
                  key={s.id}
                  title={dit}
                  className={`flex h-10 w-10 flex-col items-center justify-center rounded-lg border-2 ${
                    s.id === semaineId ? 'ring-2 ring-violet-500 ring-offset-1' : ''
                  } ${etat ? `${TEINTE_COMPORTEMENT[etat]} border-current` : 'border-gray-200 text-gray-300'}`}
                >
                  {etat
                    ? <Visage etat={etat} taille={18} />
                    : <span aria-hidden className="text-base leading-none">·</span>}
                  <span className="text-[0.6rem] font-bold">S{s.numero}</span>
                  <span className="sr-only">{dit}</span>
                </span>
              )
            })}
          </div>
          {resume.phrase && (
            <p className="mt-2 text-sm text-gray-600">
              {resume.phrase}
              {posture && <> · proposé pour le bilan : « {eleve.prenom} {posture} »</>}
            </p>
          )}
        </section>
      )}

      <section className="border-t pt-4">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
          Mes observations sur {eleve.prenom}
        </h3>

        {siennes.length === 0 ? (
          <p className="text-sm text-gray-500">Rien d’écrit pour l’instant.</p>
        ) : (
          <ul className="space-y-2">
            {siennes.map(o => (
              <li key={o.id} className="rounded-xl border p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-violet-700" aria-hidden />
                  <input
                    type="date"
                    value={o.observeeLe}
                    onChange={e => modifier(o.id, { observeeLe: e.target.value })}
                    aria-label={`Date de l’observation du ${enFrancais(o.observeeLe)}`}
                    className="rounded border border-violet-200 px-1.5 py-0.5 text-xs font-semibold text-violet-900"
                  />
                  <button
                    type="button"
                    onClick={() => retirer(o.id)}
                    disabled={isPending}
                    aria-label={`Retirer l’observation du ${enFrancais(o.observeeLe)}`}
                    className="ml-auto rounded border border-gray-200 p-1 text-gray-500 hover:border-rose-300 hover:text-rose-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <textarea
                  value={o.texte}
                  onChange={e => modifier(o.id, { texte: e.target.value })}
                  rows={2}
                  placeholder="Ce que tu as vu, avec tes mots."
                  aria-label={`Observation du ${enFrancais(o.observeeLe)}`}
                  className="mt-1.5 w-full rounded-lg border-2 border-violet-200 p-2 text-sm text-gray-900 focus:border-violet-600 focus:outline-none"
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-sm font-semibold text-gray-800">
            Le{' '}
            <input
              type="date"
              value={dateSaisie}
              onChange={e => setDateSaisie(e.target.value)}
              aria-label="Date de la nouvelle observation"
              className="rounded-lg border px-2 py-1 text-sm font-semibold text-gray-900"
            />
          </label>
          <button
            type="button"
            onClick={ajouter}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg border border-violet-600 bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter une observation
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          Une observation par moment, pas une par semaine : ce que tu vois le lundi et
          ce que tu vois le jeudi ne se mélangent pas.
        </p>
      </section>
    </div>
  )
}
