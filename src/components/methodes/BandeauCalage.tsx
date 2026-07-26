'use client'

import { CalendarClock } from 'lucide-react'
import { MAX_SEMAINES_CALAGE, type Calage } from '@/lib/calage-semaines'

type BandeauCalageProps = {
  calage: Calage
  /** Semaine de l'année sur laquelle doit tomber la première entrée du document. */
  onSemaineDepart: (semaine: number) => void
}

// L'ecran doit etre honnete sur sa certitude. Un calage deduit du seul ordre de
// la liste n'est pas un calage sur, et c'est exactement la que la question du
// demarrage sert.
const PHRASES: Record<Calage['base'], string> = {
  numeros: 'Ton document numérote ses semaines : son contenu est placé sur ces numéros.',
  dates: 'Ton document donne des dates : son contenu est placé sur les semaines correspondantes.',
  ordre: 'Ton document ne numérote pas ses semaines : son contenu est placé dans l’ordre, à partir de la première semaine. Vérifie que ça tombe juste.',
}

const CHAMP =
  'rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 ' +
  'outline-none transition-colors focus:border-violet-600 focus:ring-4 focus:ring-violet-200/70 ' +
  'motion-reduce:transition-none'

/** '1, 2 et 5' : enumeration en francais, pas '1, 2, 5'. */
function enumerer(numeros: number[]): string {
  if (numeros.length <= 1) return numeros.join('')
  return `${numeros.slice(0, -1).join(', ')} et ${numeros[numeros.length - 1]}`
}

export default function BandeauCalage({ calage, onSemaineDepart }: BandeauCalageProps) {
  const vides = calage.lignes.filter(ligne => ligne.vide).map(ligne => ligne.numero)
  const pluriel = vides.length > 1

  return (
    <section
      aria-label="Placement dans l’année"
      className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded-lg border border-violet-200 bg-white p-2 text-violet-700">
          <CalendarClock size={18} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm leading-6 text-violet-950">{PHRASES[calage.base]}</p>

          <div className="flex flex-wrap items-center gap-3">
            <label
              className="text-sm font-medium text-violet-950"
              htmlFor="calage-semaine-depart"
            >
              Ta progression démarre à quelle semaine ?
            </label>
            <select
              id="calage-semaine-depart"
              className={CHAMP}
              value={String(calage.semaineDepart)}
              onChange={event => onSemaineDepart(Number(event.target.value))}
            >
              {Array.from({ length: MAX_SEMAINES_CALAGE }, (_, index) => index + 1).map(numero => (
                <option key={numero} value={numero}>
                  Semaine {numero}
                </option>
              ))}
            </select>
          </div>

          {vides.length > 0 && (
            <p className="rounded-xl border border-violet-200 bg-white p-3 text-sm leading-6 text-slate-700">
              {pluriel
                ? `Les semaines ${enumerer(vides)} n’ont pas encore de contenu.`
                : `La semaine ${vides[0]} n’a pas encore de contenu.`}
              {' '}
              C’est normal si elle sert à l’accueil et à la présentation des manuels.
              {' '}
              Tu pourras la remplir plus tard.
            </p>
          )}

          {calage.avertissements.map(avertissement => (
            <p
              key={avertissement}
              className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
            >
              {avertissement}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
