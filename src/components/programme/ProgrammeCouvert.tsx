'use client'

import { useMemo, useState, useTransition } from 'react'
import { Undo2 } from 'lucide-react'
import {
  definirCompetenceTravaillee,
  definirDomaineTravaille,
} from '@/lib/actions/competences-travaillees'

export type Competence = {
  id: string
  matiere: string
  domaine: string
  libelle: string
}

const LIBELLE_MATIERE: Record<string, string> = {
  francais: '📖 Français',
  maths: '🔢 Maths',
  emc: '🤝 EMC',
  arts: '🎨 Arts',
  eps: '🤸 EPS',
  qlm: '🌍 Questionner le monde',
  'langue-vivante': '🗣️ Langue vivante',
}

function nommer(matiere: string) {
  return LIBELLE_MATIERE[matiere] ?? matiere.charAt(0).toUpperCase() + matiere.slice(1)
}

/**
 * « Programme couvert » : cocher les compétences officielles travaillées.
 *
 * Virage du 28/07/2026. L'écran partait des notions du manuel, qu'il fallait
 * rattacher une par une aux compétences. Christophe : « c'est encore trop
 * détaillé, la base doit être les compétences officielles uniquement, pas
 * besoin de jour 1, jour 2 ». Le manuel sert à préparer la classe, le programme
 * à remplir le livret.
 *
 * Une seule saisie : la case « travaillé pendant cette période ». Elle vaut
 * pour la classe entière ; le positionnement, lui, reste par élève.
 */
export default function ProgrammeCouvert({
  competences,
  periodes,
  travaillees,
}: {
  competences: Competence[]
  periodes: number[]
  travaillees: { periode: number; competenceId: string }[]
}) {
  const matieres = useMemo(() => [...new Set(competences.map(c => c.matiere))], [competences])
  const [matiere, setMatiere] = useState(matieres[0] ?? '')
  const [periode, setPeriode] = useState(periodes[0] ?? 1)
  const [isPending, startTransition] = useTransition()
  const [erreur, setErreur] = useState('')

  const cle = (p: number, id: string) => `${p}|${id}`
  const [prises, setPrises] = useState<Set<string>>(
    () => new Set(travaillees.map(t => cle(t.periode, t.competenceId))),
  )
  /** Ce qu'on vient de cocher ou décocher en masse, tant qu'on peut l'annuler. */
  const [annulable, setAnnulable] = useState<
    { ids: string[]; etaient: boolean; quoi: string } | null
  >(null)

  const estPrise = (id: string) => prises.has(cle(periode, id))

  const deLaMatiere = useMemo(
    () => competences.filter(c => c.matiere === matiere),
    [competences, matiere],
  )

  const parDomaine = useMemo(() => {
    const groupes: { domaine: string; liste: Competence[] }[] = []
    for (const c of deLaMatiere) {
      const dernier = groupes[groupes.length - 1]
      if (dernier && dernier.domaine === c.domaine) dernier.liste.push(c)
      else groupes.push({ domaine: c.domaine, liste: [c] })
    }
    return groupes
  }, [deLaMatiere])

  function poser(ids: string[], valeur: boolean) {
    setPrises(etat => {
      const suivant = new Set(etat)
      for (const id of ids) {
        if (valeur) suivant.add(cle(periode, id))
        else suivant.delete(cle(periode, id))
      }
      return suivant
    })
  }

  function basculer(competence: Competence) {
    const valeur = !estPrise(competence.id)
    setErreur('')
    setAnnulable(null)
    poser([competence.id], valeur)

    startTransition(async () => {
      const r = await definirCompetenceTravaillee(periode, competence.id, valeur)
      if (!r.ok) {
        poser([competence.id], !valeur)
        setErreur(r.message)
      }
    })
  }

  function basculerDomaine(domaine: string, liste: Competence[], valeur: boolean) {
    const ids = liste.map(c => c.id)
    setErreur('')
    poser(ids, valeur)

    startTransition(async () => {
      const r = await definirDomaineTravaille(periode, ids, valeur)
      if (!r.ok) {
        poser(ids, !valeur)
        setErreur(r.message)
        return
      }
      if (r.valeur.length > 0) {
        setAnnulable({ ids: r.valeur, etaient: !valeur, quoi: domaine })
      }
    })
  }

  function annuler() {
    const retour = annulable
    if (!retour) return
    setAnnulable(null)
    poser(retour.ids, retour.etaient)

    startTransition(async () => {
      const r = await definirDomaineTravaille(periode, retour.ids, retour.etaient)
      if (!r.ok) {
        poser(retour.ids, !retour.etaient)
        setErreur(r.message)
        setAnnulable(retour)
      }
    })
  }

  const compteMatiere = (m: string) => {
    const liste = competences.filter(c => c.matiere === m)
    return { faites: liste.filter(c => estPrise(c.id)).length, total: liste.length }
  }

  const retenues = deLaMatiere.filter(c => estPrise(c.id)).length

  if (competences.length === 0) {
    return (
      <p className="rounded-2xl border bg-white p-5 text-sm text-gray-600">
        Le programme officiel n’est pas chargé, il n’y a rien à cocher.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {annulable && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2"
        >
          <span className="text-sm text-violet-950">
            {annulable.ids.length} compétence{annulable.ids.length > 1 ? 's' : ''}{' '}
            {annulable.etaient ? 'décochée' : 'cochée'}{annulable.ids.length > 1 ? 's' : ''}{' '}
            ({annulable.quoi}).
          </span>
          <button
            type="button"
            onClick={annuler}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg border border-violet-600 bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden />
            Revenir en arrière
          </button>
          <button
            type="button"
            onClick={() => setAnnulable(null)}
            className="text-xs text-violet-800 underline"
          >
            Fermer
          </button>
        </div>
      )}

      {erreur && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {erreur}
        </p>
      )}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Matière">
        {matieres.map(m => {
          const c = compteMatiere(m)
          const actif = m === matiere
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={actif}
              onClick={() => setMatiere(m)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
                actif
                  ? 'border-violet-600 bg-violet-600 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-violet-300'
              }`}
            >
              {nommer(m)}
              <span className={`ml-2 text-xs font-normal ${actif ? 'text-violet-100' : 'text-gray-500'}`}>
                {c.faites}/{c.total}
              </span>
            </button>
          )
        })}
      </div>

      <section className="space-y-2 rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-gray-800">
            Période{' '}
            <select
              value={periode}
              onChange={e => { setPeriode(Number(e.target.value)); setAnnulable(null) }}
              className="rounded-lg border px-2 py-1 font-semibold text-gray-900"
            >
              {periodes.map(p => <option key={p} value={p}>Période {p}</option>)}
            </select>
          </label>
          <span className="text-sm text-gray-600">
            {retenues === 0
              ? 'aucune compétence retenue pour l’instant'
              : `${retenues} compétence${retenues > 1 ? 's' : ''} retenue${retenues > 1 ? 's' : ''} en ${nommer(matiere).replace(/^\S+\s/, '')}`}
          </span>
          {isPending && <span className="text-xs text-gray-500">Enregistrement...</span>}
        </div>

        {parDomaine.map(({ domaine, liste }) => {
          const toutes = liste.every(c => estPrise(c.id))
          return (
            <div key={domaine}>
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-violet-50 px-2.5 py-1.5">
                <h3 className="font-serif text-sm font-bold text-violet-900">{domaine}</h3>
                <button
                  type="button"
                  onClick={() => basculerDomaine(domaine, liste, !toutes)}
                  disabled={isPending}
                  className="ml-auto rounded-lg border border-violet-300 bg-white px-2 py-0.5 text-xs font-semibold text-violet-800 hover:border-violet-600 disabled:opacity-50"
                >
                  {toutes ? 'Tout décocher' : 'Tout cocher'}
                </button>
              </div>
              <ul>
                {liste.map(c => (
                  <li key={c.id} className="flex items-start gap-2 border-b py-1.5 text-sm last:border-b-0">
                    <input
                      id={`comp-${c.id}`}
                      type="checkbox"
                      checked={estPrise(c.id)}
                      onChange={() => basculer(c)}
                      disabled={isPending}
                      className="mt-1 h-4 w-4 shrink-0 accent-violet-600"
                    />
                    <label
                      htmlFor={`comp-${c.id}`}
                      className={`cursor-pointer ${estPrise(c.id) ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                    >
                      {c.libelle}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>
    </div>
  )
}
