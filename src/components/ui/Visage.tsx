'use client'

import {
  ETATS_COMPORTEMENT,
  LIBELLE_COMPORTEMENT,
  type EtatComportement,
} from '@/lib/comportement'

/**
 * Le visage, traitement E3 : pas de fond, un trait épais aux bouts arrondis.
 * Choisi par Christophe le 28/07/2026 parmi trois traitements.
 *
 * Dessiné et pas pris dans les emoji : un emoji change de tête selon le
 * téléphone, l'ordinateur et la version, alors que ce dessin sera identique
 * partout et se retouche.
 *
 * Pas de sourcils, pas de grimace. « Difficile » se dit par une bouche droite
 * légèrement inclinée, jamais par une figure qui boude : on décrit une
 * semaine, pas un enfant, et le livret sera lu par ses parents.
 */
export function Visage({ etat, taille = 26 }: { etat: EtatComportement; taille?: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="8.9" cy="9.9" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.1" cy="9.9" r="1" fill="currentColor" stroke="none" />
      {etat === 'bien' && <path d="M8.4 14c1 1.6 2.3 2.4 3.6 2.4s2.6-.8 3.6-2.4" />}
      {etat === 'attention' && <path d="M8.7 15h6.6" />}
      {etat === 'difficile' && <path d="M8.7 15.7l6.6-1.2" />}
    </svg>
  )
}

// Un cran plus vives que le rouge et vert classiques, qui font signalisation
// routiere, et distinctes du violet de l'application.
export const COULEUR_COMPORTEMENT: Record<EtatComportement, { choisi: string; libre: string }> = {
  difficile: {
    choisi: 'border-rose-600 bg-rose-50 text-rose-700',
    libre: 'border-gray-200 bg-white text-gray-500 hover:border-rose-300',
  },
  attention: {
    choisi: 'border-amber-500 bg-amber-50 text-amber-700',
    libre: 'border-gray-200 bg-white text-gray-500 hover:border-amber-300',
  },
  bien: {
    choisi: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    libre: 'border-gray-200 bg-white text-gray-500 hover:border-emerald-300',
  },
}

/** La teinte du visage seul, pour la frise. */
export const TEINTE_COMPORTEMENT: Record<EtatComportement, string> = {
  difficile: 'text-rose-600',
  attention: 'text-amber-500',
  bien: 'text-emerald-500',
}

/**
 * Les trois états, en `radiogroup`. Recliquer l'état déjà choisi l'enlève :
 * on se trompe de bouton, et « rien de noté » doit rester atteignable.
 */
export default function ChoixComportement({
  valeur,
  onChange,
  disabled,
  libelle,
}: {
  valeur: EtatComportement | null
  onChange: (valeur: EtatComportement | null) => void
  disabled: boolean
  libelle: string
}) {
  return (
    <div role="radiogroup" aria-label={libelle} className="flex flex-wrap gap-2">
      {ETATS_COMPORTEMENT.map(etat => {
        const choisi = valeur === etat
        return (
          <button
            key={etat}
            type="button"
            role="radio"
            aria-checked={choisi}
            aria-label={`${libelle} : ${LIBELLE_COMPORTEMENT[etat]}`}
            disabled={disabled}
            onClick={() => onChange(choisi ? null : etat)}
            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
              choisi ? COULEUR_COMPORTEMENT[etat].choisi : COULEUR_COMPORTEMENT[etat].libre
            }`}
          >
            <Visage etat={etat} taille={24} />
            {LIBELLE_COMPORTEMENT[etat]}
          </button>
        )
      })}
    </div>
  )
}
