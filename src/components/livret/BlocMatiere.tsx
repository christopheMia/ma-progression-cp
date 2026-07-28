'use client'

import { useState } from 'react'
import { Copy, Sparkles } from 'lucide-react'
import { redigerAppreciation, type Brique, type Formulation } from '@/lib/briques-bilan'
import type { ElementLivret } from '@/lib/briques-bilan'
import { LIBELLE_NIVEAU } from '@/lib/niveaux'
import type { Eleve, EtatAppreciation } from '@/components/livret/Livret'

const FORMULATION_VIDE: Formulation = {
  eclat: '', reussite: '', encours: '', vigilance: '', suite: '',
}

/**
 * Le commentaire d'UNE matière : ses briques, sa rédaction, son texte
 * modifiable et son bouton de copie.
 *
 * Le livret officiel demande un commentaire par matière, donc l'écran a la
 * forme du document à remplir. La case du titre ne décide que de la copie
 * groupée : une matière décochée reste lisible et modifiable.
 */
export default function BlocMatiere({
  titre,
  eleve,
  briques,
  aFormuler,
  formulations,
  etat,
  choisie,
  disabled,
  onChoisie,
  onChange,
  onFormulation,
  onCopier,
}: {
  titre: string
  eleve: Eleve
  briques: Brique[]
  aFormuler: ElementLivret[]
  formulations: Record<string, Formulation>
  etat: EtatAppreciation
  choisie: boolean
  disabled: boolean
  onChoisie: (valeur: boolean) => void
  onChange: (changement: Partial<EtatAppreciation>) => void
  onFormulation: (competenceId: string, formulation: Formulation) => void
  onCopier: () => void
}) {
  const [confirmation, setConfirmation] = useState('')

  function basculer(brique: Brique) {
    const ecartees = brique.actif
      ? [...etat.ecartees, brique.cle]
      : etat.ecartees.filter(c => c !== brique.cle)
    onChange({ ecartees })
  }

  function retoucher(brique: Brique, texte: string, suite: string) {
    onChange({
      retouchees: { ...etat.retouchees, [`${brique.cle}|${brique.role}`]: { texte, suite } },
    })
  }

  function rediger() {
    const texte = redigerAppreciation(briques, eleve)
    onChange({ texte })
    setConfirmation(texte ? '✓ rédigé, à relire' : 'aucune brique cochée')
    setTimeout(() => setConfirmation(''), 4000)
  }

  return (
    <section className={`rounded-2xl border bg-white p-4 ${choisie ? '' : 'opacity-70'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="checkbox"
          checked={choisie}
          onChange={e => onChoisie(e.target.checked)}
          aria-label={`Inclure ${titre} dans la copie groupée`}
          className="h-4 w-4 accent-violet-600"
        />
        <h2 className="font-bold text-gray-800">
          {titre} : acquisitions, progrès et difficultés éventuelles
        </h2>
        <button
          type="button"
          onClick={onCopier}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-violet-300 px-2.5 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-50"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copier {titre}
        </button>
      </div>

      {aFormuler.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">
            {aFormuler.length === 1
              ? 'Une compétence attend tes mots'
              : `${aFormuler.length} compétences attendent tes mots`}
          </p>
          <p className="mt-0.5 text-xs text-amber-800">
            Le libellé officiel est écrit pour l’institution. Dis avec tes mots ce qu’un
            parent doit comprendre : la phrase servira toutes les années suivantes.
          </p>
          <ul className="mt-2 space-y-2">
            {aFormuler.map(element => (
              <ChampFormulation
                key={element.competenceId}
                element={element}
                formulation={formulations[element.competenceId] ?? FORMULATION_VIDE}
                disabled={disabled}
                onEnregistrer={onFormulation}
              />
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-600">
        Décoche ce que tu ne veux pas dire, corrige les formulations, puis rédige.
      </p>

      {briques.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">
          Rien de positionné dans cette matière sur la période : il n’y a pas encore de
          quoi rédiger.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {briques.map(brique => (
            <li
              key={`${brique.cle}|${brique.role}`}
              className={`flex items-start gap-2 rounded-xl border p-2 ${brique.actif ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
            >
              <input
                type="checkbox"
                checked={brique.actif}
                onChange={() => basculer(brique)}
                aria-label={`Utiliser : ${brique.texte}`}
                className="mt-1 h-4 w-4 shrink-0 accent-violet-600"
              />
              <div className="min-w-0 flex-1">
                <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-violet-700">
                  {brique.role}
                  <span className="font-normal normal-case tracking-normal text-gray-500">
                    {' '}· {brique.source}
                  </span>
                </span>
                <input
                  value={brique.texte}
                  onChange={e => retoucher(brique, e.target.value, brique.suite)}
                  aria-label={`Texte de la brique : ${brique.role}`}
                  className="mt-1 w-full rounded-lg border border-violet-200 px-2 py-1 text-sm text-gray-900"
                />
                {brique.role === 'vigilance' && (
                  <input
                    value={brique.suite}
                    onChange={e => retoucher(brique, brique.texte, e.target.value)}
                    placeholder="et ce que tu vas faire"
                    aria-label="Prochaine étape"
                    className="mt-1 w-full rounded-lg border border-violet-200 px-2 py-1 text-sm text-gray-900"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={rediger}
          disabled={disabled || briques.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-violet-600 bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Rédiger
        </button>
        {confirmation && (
          <span role="status" className="text-sm font-semibold text-emerald-700">{confirmation}</span>
        )}
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Le commentaire de {titre}
        </span>
        <textarea
          value={etat.texte}
          onChange={e => onChange({ texte: e.target.value })}
          rows={4}
          placeholder="Le texte apparaîtra ici après « Rédiger », et reste modifiable."
          className="w-full rounded-lg border-2 border-violet-200 p-2 text-sm text-gray-900 focus:border-violet-600 focus:outline-none"
        />
      </label>
    </section>
  )
}

/** Un champ pour dire une compétence avec les mots de l'enseignante. */
function ChampFormulation({
  element,
  formulation,
  disabled,
  onEnregistrer,
}: {
  element: ElementLivret
  formulation: Formulation
  disabled: boolean
  onEnregistrer: (competenceId: string, formulation: Formulation) => void
}) {
  const niveau = element.niveau ?? 'atteint'
  const champ = niveau === 'depasse' || niveau === 'atteint'
    ? 'reussite'
    : niveau === 'partiellement' ? 'encours' : 'vigilance'

  const [texte, setTexte] = useState(formulation[champ])
  const [suite, setSuite] = useState(formulation.suite)

  const manqueSuite = niveau === 'non_atteint' && !suite.trim()

  function enregistrer() {
    if (!texte.trim() || manqueSuite) return
    onEnregistrer(element.competenceId, { ...formulation, [champ]: texte, suite })
  }

  return (
    <li className="rounded-lg bg-white p-2">
      <p className="text-xs text-gray-600">
        {element.libelle}
        <span className="ml-1 font-semibold text-gray-800">· {LIBELLE_NIVEAU[niveau]}</span>
      </p>
      <input
        value={texte}
        onChange={e => setTexte(e.target.value)}
        placeholder={
          niveau === 'non_atteint'
            ? 'Exemple : le déchiffrage demande encore beaucoup d’aide'
            : 'Exemple : lit avec assurance les mots contenant les sons étudiés'
        }
        aria-label={`Comment dire « ${element.libelle} » quand c’est ${LIBELLE_NIVEAU[niveau]}`}
        className="mt-1 w-full rounded-lg border border-amber-300 px-2 py-1 text-sm text-gray-900"
      />
      {niveau === 'non_atteint' && (
        <input
          value={suite}
          onChange={e => setSuite(e.target.value)}
          placeholder="et ce que tu vas faire (obligatoire)"
          aria-label="Prochaine étape"
          className="mt-1 w-full rounded-lg border border-amber-300 px-2 py-1 text-sm text-gray-900"
        />
      )}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={enregistrer}
          disabled={disabled || !texte.trim() || manqueSuite}
          className="rounded-lg border border-amber-600 bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          Garder cette phrase
        </button>
        {manqueSuite && (
          <span className="text-xs text-amber-900">
            Une difficulté ne s’écrit jamais seule : dis ce que tu vas faire.
          </span>
        )}
      </div>
    </li>
  )
}
