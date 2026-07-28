'use client'

import {
  ABREVIATION_NIVEAU,
  LIBELLE_NIVEAU,
  NIVEAUX,
  type Niveau,
} from '@/lib/niveaux'

// Une famille de couleurs a part, volontairement differente du violet de
// l'application : un niveau ne doit jamais se confondre avec un element
// d'interface.
const COULEURS_NIVEAU: Record<Niveau, { choisi: string; libre: string }> = {
  non_atteint: {
    choisi: 'border-red-600 bg-red-50 text-red-700',
    libre: 'border-gray-200 bg-white text-gray-500 hover:border-red-300 hover:text-red-700',
  },
  partiellement: {
    choisi: 'border-amber-600 bg-amber-50 text-amber-700',
    libre: 'border-gray-200 bg-white text-gray-500 hover:border-amber-300 hover:text-amber-700',
  },
  atteint: {
    choisi: 'border-emerald-600 bg-emerald-50 text-emerald-700',
    libre: 'border-gray-200 bg-white text-gray-500 hover:border-emerald-300 hover:text-emerald-700',
  },
  depasse: {
    choisi: 'border-blue-600 bg-blue-50 text-blue-700',
    libre: 'border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-700',
  },
}

/**
 * Les quatre niveaux du livret, en abrege.
 *
 * Un vrai `radiogroup` : un seul niveau a la fois, les fleches du clavier
 * circulent dans le groupe, et un seul bouton est atteignable a la tabulation
 * (le niveau choisi, ou le premier tant que rien n'est choisi). C'est ce que
 * les lecteurs d'ecran attendent d'une echelle.
 *
 * Les quatre boutons restent sur UNE ligne : replies sur deux, l'echelle ne se
 * lit plus comme une echelle.
 *
 * Sert dans le suivi de la semaine ET dans le livret : c'est le meme geste,
 * donc le meme composant.
 */
export default function BoutonsNiveau({
  valeur,
  onChange,
  disabled,
  libelle,
}: {
  valeur: Niveau | null
  onChange: (valeur: Niveau) => void
  disabled: boolean
  libelle: string
}) {
  const index = valeur === null ? -1 : NIVEAUX.indexOf(valeur)

  function auClavier(event: React.KeyboardEvent<HTMLDivElement>) {
    const pas = event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? -1
        : 0
    if (pas === 0 || disabled) return
    event.preventDefault()
    const depart = index === -1 ? (pas === 1 ? -1 : 0) : index
    onChange(NIVEAUX[(depart + pas + NIVEAUX.length) % NIVEAUX.length])
  }

  return (
    <div
      role="radiogroup"
      aria-label={libelle}
      onKeyDown={auClavier}
      className="flex flex-nowrap gap-1"
    >
      {NIVEAUX.map((niveau, i) => {
        const choisi = valeur === niveau
        return (
          <button
            key={niveau}
            type="button"
            role="radio"
            aria-checked={choisi}
            aria-label={`${libelle} : ${LIBELLE_NIVEAU[niveau]}`}
            tabIndex={choisi || (index === -1 && i === 0) ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(niveau)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors disabled:opacity-50 ${
              choisi ? COULEURS_NIVEAU[niveau].choisi : COULEURS_NIVEAU[niveau].libre
            }`}
          >
            {ABREVIATION_NIVEAU[niveau]}
          </button>
        )
      })}
    </div>
  )
}

/** La legende des abreviations, a poser une fois par bloc. */
export function LegendeNiveaux() {
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
      {NIVEAUX.map(niveau => (
        <span key={niveau}>
          <span className="font-bold text-gray-800">{ABREVIATION_NIVEAU[niveau]}</span>{' '}
          {LIBELLE_NIVEAU[niveau]}
        </span>
      ))}
    </p>
  )
}
