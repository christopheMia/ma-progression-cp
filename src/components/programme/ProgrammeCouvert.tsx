'use client'

import { useMemo, useState } from 'react'
import NotionLigne, { type CompChoix } from '@/components/programme/NotionLigne'
import ProposerRattachementsButton from '@/components/programme/ProposerRattachementsButton'
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

  const compte = useMemo(() => {
    const total: Record<string, { faites: number; total: number }> = {}
    for (const n of notions) {
      const c = total[n.matiere] ?? { faites: 0, total: 0 }
      c.total++
      if (n.competenceId && !n.melange) c.faites++
      total[n.matiere] = c
    }
    return total
  }, [notions])

  const deLaMatiere = notions.filter(n => n.matiere === matiere)

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
    liste.some(n => !n.competenceId || n.melange))?.[0] ?? null

  if (matieres.length === 0) {
    return (
      <p className="rounded-2xl border bg-white p-5 text-sm text-gray-600">
        Aucune progression saisie pour l’instant, donc rien à rattacher.
      </p>
    )
  }

  return (
    <div className="space-y-3">
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

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={resteSeulement}
            onChange={e => setResteSeulement(e.target.checked)}
            className="h-4 w-4 accent-violet-600"
          />
          Ne montrer que ce qui reste à rattacher
        </label>

        {parPeriode.map(([periode, liste]) => {
          const restantes = liste.filter(n => !n.competenceId || n.melange)
          const visibles = resteSeulement ? restantes : liste
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
                        competenceId={n.competenceId}
                        melange={n.melange}
                        competences={competencesParMatiere[matiere] ?? []}
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
