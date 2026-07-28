'use client'

import { useMemo, useState, useTransition } from 'react'
import { Undo2 } from 'lucide-react'
import NotionLigne, { type CompChoix } from '@/components/programme/NotionLigne'
import ProposerRattachementsButton from '@/components/programme/ProposerRattachementsButton'
import {
  detacherNotions,
  restaurerRattachements,
  type CibleDetachement,
  type LienSupprime,
} from '@/lib/actions/mapping'
import type { NotionGroupee } from '@/lib/programme-couvert'

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
 * L'écran « Programme couvert », navigable.
 *
 * Refait le 28/07/2026. Christophe : « il faut défiler pendant une heure pour
 * accéder à chaque matière, c'est horrible. » La page rendait toutes les
 * matières, toutes les périodes et toutes les semaines d'un coup, soit plus de
 * six mille lignes. Quatre changements :
 *
 *   - une LIGNE PAR NOTION et non par semaine (le gros du problème) ;
 *   - une MATIÈRE À LA FOIS, choisie par des onglets qui portent l'avancement ;
 *   - les PÉRIODES REPLIÉES, seule la première inachevée ouverte ;
 *   - un filtre « ne montrer que ce qui reste », allumé par défaut, parce
 *     qu'on vient ici pour rattacher et pas pour relire ce qui est fait.
 */
export default function ProgrammeCouvert({
  notions,
  competencesParMatiere,
  nbCompetences,
  couvertesParMatiere,
}: {
  notions: NotionGroupee[]
  competencesParMatiere: Record<string, CompChoix[]>
  nbCompetences: Record<string, number>
  couvertesParMatiere: Record<string, number>
}) {
  const matieres = useMemo(() => [...new Set(notions.map(n => n.matiere))], [notions])
  const [matiere, setMatiere] = useState(matieres[0] ?? '')
  const [resteSeulement, setResteSeulement] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [erreur, setErreur] = useState('')

  // Le rattachement de chaque notion vit ici : c'est aussi d'ici que partent
  // les detachements en masse, et deux sources de verite divergeraient.
  const cle = (m: string, notion: string) => `${m}|${notion}`
  const [rattachees, setRattachees] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const n of notions) if (n.competenceId && !n.melange) init[cle(n.matiere, n.notion)] = n.competenceId
    return init
  })
  const [melanges, setMelanges] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const n of notions) if (n.melange) init[cle(n.matiere, n.notion)] = true
    return init
  })

  /** Ce qu'on vient de retirer, tant qu'on peut encore l'annuler. */
  const [annulable, setAnnulable] = useState<{ liens: LienSupprime[]; quoi: string } | null>(null)

  const compte = useMemo(() => {
    const total: Record<string, { faites: number; total: number }> = {}
    for (const n of notions) {
      const c = total[n.matiere] ?? { faites: 0, total: 0 }
      c.total++
      if (rattachees[cle(n.matiere, n.notion)]) c.faites++
      total[n.matiere] = c
    }
    return total
  }, [notions, rattachees])

  const deLaMatiere = notions.filter(n => n.matiere === matiere)
  const estRattachee = (n: NotionGroupee) =>
    Boolean(rattachees[cle(n.matiere, n.notion)]) || melanges[cle(n.matiere, n.notion)]

  function rattacher(notionTexte: string, competenceId: string) {
    setErreur('')
    setAnnulable(null)
    setRattachees(etat => ({ ...etat, [cle(matiere, notionTexte)]: competenceId }))
    setMelanges(etat => ({ ...etat, [cle(matiere, notionTexte)]: false }))
  }

  /** Le serveur a refusé : on remet l'affichage d'avant, sans rien lui redemander. */
  function remettre(notionTexte: string, precedente?: string) {
    setRattachees(etat => {
      const suivant = { ...etat }
      if (precedente === undefined) delete suivant[cle(matiere, notionTexte)]
      else suivant[cle(matiere, notionTexte)] = precedente
      return suivant
    })
  }

  /** Retire des rattachements, à n'importe quelle échelle, et garde de quoi annuler. */
  function detacher(cibles: CibleDetachement[], quoi: string) {
    setErreur('')
    setRattachees(etat => {
      const suivant = { ...etat }
      for (const c of cibles) for (const n of c.notions) delete suivant[cle(c.matiere, n)]
      return suivant
    })
    setMelanges(etat => {
      const suivant = { ...etat }
      for (const c of cibles) for (const n of c.notions) suivant[cle(c.matiere, n)] = false
      return suivant
    })

    startTransition(async () => {
      const r = await detacherNotions(cibles)
      if (!r.ok) {
        setErreur(r.message)
        return
      }
      if (r.valeur.length > 0) setAnnulable({ liens: r.valeur, quoi })
    })
  }

  function annuler() {
    const aRemettre = annulable
    if (!aRemettre) return
    setAnnulable(null)
    setRattachees(etat => {
      const suivant = { ...etat }
      for (const lien of aRemettre.liens) suivant[cle(lien.matiere, lien.notion)] = lien.competence_id
      return suivant
    })

    startTransition(async () => {
      const r = await restaurerRattachements(aRemettre.liens)
      if (!r.ok) {
        setErreur(r.message)
        setAnnulable(aRemettre)
      }
    })
  }

  function ciblesPour(liste: NotionGroupee[]): CibleDetachement[] {
    const parMatiere = new Map<string, string[]>()
    for (const n of liste.filter(estRattachee)) {
      const notionsM = parMatiere.get(n.matiere) ?? []
      notionsM.push(n.notion)
      parMatiere.set(n.matiere, notionsM)
    }
    return [...parMatiere.entries()].map(([m, notionsM]) => ({ matiere: m, notions: notionsM }))
  }

  function detacherEnMasse(liste: NotionGroupee[], quoi: string) {
    const cibles = ciblesPour(liste)
    const combien = cibles.reduce((n, c) => n + c.notions.length, 0)
    if (combien === 0) return
    if (!window.confirm(
      `Retirer le rattachement de ${combien} notion${combien > 1 ? 's' : ''} (${quoi}) ? `
      + 'Tu pourras annuler juste après.',
    )) return
    detacher(cibles, quoi)
  }

  const parPeriode = useMemo(() => {
    const groupes = new Map<number | null, NotionGroupee[]>()
    for (const n of deLaMatiere) {
      const liste = groupes.get(n.periode) ?? []
      liste.push(n)
      groupes.set(n.periode, liste)
    }
    return [...groupes.entries()].sort((a, b) => (a[0] ?? 99) - (b[0] ?? 99))
  }, [deLaMatiere])

  // La première période inachevée s'ouvre : on arrive sur du travail à faire.
  const premiereInachevee = parPeriode.find(([, liste]) =>
    liste.some(n => !estRattachee(n)))?.[0] ?? null

  if (matieres.length === 0) {
    return (
      <p className="rounded-2xl border bg-white p-5 text-sm text-gray-600">
        Aucune progression saisie pour l’instant, donc rien à rattacher.
      </p>
    )
  }

  const rattacheesEnTout = notions.filter(estRattachee).length

  return (
    <div className="space-y-3">
      {/* Le rattrapage : tant qu'il est la, rien n'est vraiment perdu. */}
      {annulable && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2"
        >
          <span className="text-sm text-violet-950">
            {annulable.liens.length} rattachement{annulable.liens.length > 1 ? 's' : ''} retiré
            {annulable.liens.length > 1 ? 's' : ''} ({annulable.quoi}).
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
          const c = compte[m] ?? { faites: 0, total: 0 }
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

      <section className="space-y-3 rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-gray-700">
            {nommer(matiere)}
            <span className="ml-2 text-xs font-normal text-gray-500">
              {couvertesParMatiere[matiere] ?? 0}/{nbCompetences[matiere] ?? 0} compétences officielles couvertes
            </span>
          </h2>
          <ProposerRattachementsButton matiere={matiere} label={nommer(matiere)} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={resteSeulement}
              onChange={e => setResteSeulement(e.target.checked)}
              className="h-4 w-4 accent-violet-600"
            />
            Ne montrer que ce qui reste à rattacher
          </label>

          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => detacherEnMasse(deLaMatiere, nommer(matiere))}
              disabled={isPending || deLaMatiere.filter(estRattachee).length === 0}
              className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:border-violet-300 hover:text-violet-800 disabled:opacity-40"
            >
              Tout détacher dans {nommer(matiere)}
            </button>
            <button
              type="button"
              onClick={() => detacherEnMasse(notions, 'toutes les matières')}
              disabled={isPending || rattacheesEnTout === 0}
              className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:border-violet-300 hover:text-violet-800 disabled:opacity-40"
            >
              Tout détacher, toutes matières
            </button>
          </div>
        </div>

        {parPeriode.map(([periode, liste]) => {
          const restantes = liste.filter(n => !estRattachee(n))
          const faites = liste.length - restantes.length
          const visibles = resteSeulement ? restantes : liste
          const nomPeriode = periode ? `période ${periode}` : 'hors période'
          return (
            <details
              key={String(periode)}
              open={periode === premiereInachevee}
              className="rounded-xl border border-violet-100"
            >
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-violet-800">
                {periode ? `Période ${periode}` : 'Hors période'}
                <span className="ml-2 text-xs font-normal text-gray-600">
                  {liste.length} notion{liste.length > 1 ? 's' : ''}
                  {restantes.length === 0
                    ? ' · toutes rattachées'
                    : ` · ${restantes.length} à rattacher`}
                </span>
              </summary>

              <div className="px-3 pb-2">
                {faites > 0 && (
                  <div className="flex justify-end pb-1">
                    <button
                      type="button"
                      onClick={() => detacherEnMasse(liste, nomPeriode)}
                      disabled={isPending}
                      className="rounded-lg border border-gray-300 px-2 py-0.5 text-xs font-semibold text-gray-700 hover:border-violet-300 hover:text-violet-800 disabled:opacity-40"
                    >
                      Détacher les {faites} de cette période
                    </button>
                  </div>
                )}
                {visibles.length === 0 ? (
                  <p className="py-2 text-sm text-gray-500">
                    Tout est rattaché ici. Décoche le filtre pour revoir ces notions.
                  </p>
                ) : (
                  <ul>
                    {visibles.map(n => (
                      <NotionLigne
                        key={n.notion}
                        matiere={n.matiere}
                        notion={n.notion}
                        semaines={n.semaines}
                        competenceId={rattachees[cle(n.matiere, n.notion)]}
                        melange={melanges[cle(n.matiere, n.notion)]}
                        competences={competencesParMatiere[matiere] ?? []}
                        onRattachee={rattacher}
                        onDetachee={notionTexte =>
                          detacher([{ matiere: n.matiere, notions: [notionTexte] }], notionTexte)}
                        onEchec={remettre}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </details>
          )
        })}

        {(competencesParMatiere[matiere] ?? []).length === 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Le programme officiel ne connaît aucune compétence pour cette matière, il n’y
            a donc rien à quoi rattacher. Ces notions n’iront pas dans le livret tant que
            le référentiel n’est pas complété.
          </p>
        )}
      </section>
    </div>
  )
}
