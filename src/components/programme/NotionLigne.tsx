'use client'
import { useState, useTransition } from 'react'
import {
  compterNotionsSemblables,
  rattacherNotionPartout,
  rattacherNotionsSemblables,
} from '@/lib/actions/mapping'

export type CompChoix = { id: string; domaine: string; libelle: string }

type Proposition = { notions: string[]; tete: string; competenceId: string }

/**
 * Une notion de la méthode, avec le menu pour choisir sa compétence officielle.
 *
 * Une LIGNE PAR NOTION, pas par semaine : « Lire a » revient dix-sept fois dans
 * l'année et c'est la même compétence les dix-sept fois. Le choix vaut donc
 * pour toutes ses semaines (mesure du 28/07 : 5 340 lignes affichées pour 314
 * notions réellement différentes).
 *
 * La page ne se recharge pas : elle le faisait par `window.location.reload()`,
 * ce qui renvoyait en haut à chaque choix.
 */
export default function NotionLigne({ matiere, notion, semaines, competenceId, melange, competences }: {
  matiere: string
  notion: string
  semaines: number[]
  competenceId?: string
  melange?: boolean
  competences: CompChoix[]
}) {
  const [isPending, startTransition] = useTransition()
  // Le choix est tenu ici, pas seulement dans la propriete : sans ca le menu
  // reviendrait a sa valeur d'avant en attendant la reponse du serveur.
  const [choisie, setChoisie] = useState(competenceId ?? '')
  const [erreur, setErreur] = useState('')
  const [proposition, setProposition] = useState<Proposition | null>(null)
  const [fait, setFait] = useState('')

  function onChange(id: string) {
    if (!id) return
    const precedente = choisie
    setErreur('')
    setFait('')
    setProposition(null)
    setChoisie(id)

    startTransition(async () => {
      const r = await rattacherNotionPartout(matiere, notion, id)
      if (!r.ok) {
        setChoisie(precedente)
        setErreur(r.message)
        return
      }
      if (r.valeur > 1) setFait(`posé sur ses ${r.valeur} semaines`)
      const semblables = await compterNotionsSemblables(matiere, notion)
      if (semblables.ok && semblables.valeur.notions.length > 0) {
        setProposition({ ...semblables.valeur, competenceId: id })
      }
    })
  }

  function appliquerAuxSemblables() {
    if (!proposition) return
    const enCours = proposition
    setErreur('')
    setProposition(null)

    startTransition(async () => {
      const r = await rattacherNotionsSemblables(matiere, notion, enCours.competenceId)
      if (!r.ok) {
        setErreur(r.message)
        setProposition(enCours)
        return
      }
      setFait(r.valeur === 1
        ? '1 notion semblable rattachée aussi.'
        : `${r.valeur} notions semblables rattachées aussi.`)
    })
  }

  return (
    <li className="border-b py-1.5 text-sm last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-gray-900">{notion}</span>
        <span className="text-xs text-gray-500">
          {semaines.length === 1 ? '1 semaine' : `${semaines.length} semaines`}
        </span>
        {!choisie && <span className="text-xs font-semibold text-amber-700">à rattacher</span>}
        {melange && (
          <span className="text-xs font-semibold text-amber-700">
            deux semaines ne disent pas la même chose
          </span>
        )}
        <select
          value={choisie}
          disabled={isPending}
          onChange={e => onChange(e.target.value)}
          aria-label={`Compétence pour ${notion}`}
          className="ml-auto max-w-full rounded border border-violet-200 bg-white px-1.5 py-0.5 text-xs text-violet-800 disabled:opacity-50">
          <option value="">— choisir une compétence —</option>
          {competences.map(c => (
            <option key={c.id} value={c.id}>{c.domaine} : {c.libelle}</option>
          ))}
        </select>
        {fait && <span className="text-xs font-semibold text-emerald-700">✓ {fait}</span>}
      </div>

      {erreur && <p role="alert" className="mt-1 text-xs text-red-700">{erreur}</p>}

      {proposition && (
        <div className="mt-1 flex flex-wrap items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1.5">
          <span className="text-xs text-violet-900">
            {proposition.notions.length === 1
              ? '1 autre notion se ressemble'
              : `${proposition.notions.length} autres notions se ressemblent`}
            {proposition.tete && <> (elles commencent par « {proposition.tete} »)</>}
            {' : '}
            <span className="text-violet-700">{proposition.notions.slice(0, 3).join(', ')}</span>
            {proposition.notions.length > 3 && <>, et {proposition.notions.length - 3} autres</>}
          </span>
          <button
            type="button"
            onClick={appliquerAuxSemblables}
            disabled={isPending}
            className="rounded-full border border-violet-600 bg-violet-600 px-2.5 py-0.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Rattacher aussi celles-là
          </button>
          <button
            type="button"
            onClick={() => setProposition(null)}
            disabled={isPending}
            className="text-xs text-violet-800 underline disabled:opacity-50"
          >
            Non merci
          </button>
        </div>
      )}
    </li>
  )
}
