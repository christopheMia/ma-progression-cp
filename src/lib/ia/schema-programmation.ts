// src/lib/ia/schema-programmation.ts
//
// Lecture d'une PROGRAMMATION ANNUELLE PAR PERIODE.
//
// Beaucoup de documents d'editeur ("Maths en CP" chez Acces, par exemple) ne
// donnent pas une progression semaine par semaine mais un tableau
// periode x domaine. Ce schema decrit ce format-la ; la repartition sur les
// vraies semaines de la classe est faite ensuite par `repartirProgrammation`.

import type { PeriodeProgrammation } from '@/lib/repartition-periode'

export const PROGRAMMATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    periodes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          numero: { type: 'integer' },
          domaines: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                nom: { type: 'string' },
                items: { type: 'array', items: { type: 'string' } },
              },
              required: ['nom', 'items'],
            },
          },
        },
        required: ['numero', 'domaines'],
      },
    },
  },
  required: ['periodes'],
} as const

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map(x => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
}

/**
 * Nettoie la sortie du modele. Une periode hors de 1..5 est ecartee : le CP
 * francais en compte cinq, et un numero fantaisiste ecrirait au mauvais endroit
 * de l'annee.
 */
export function normalizeProgrammation(brut: unknown): PeriodeProgrammation[] {
  const o = (brut ?? {}) as Record<string, unknown>
  const periodes = Array.isArray(o.periodes) ? o.periodes : []

  const propres = periodes.map(raw => {
    const p = (raw ?? {}) as Record<string, unknown>
    const domainesBruts = Array.isArray(p.domaines) ? p.domaines : []
    return {
      numero: typeof p.numero === 'number' ? p.numero : 0,
      domaines: domainesBruts
        .map(d => {
          const dd = (d ?? {}) as Record<string, unknown>
          return {
            nom: typeof dd.nom === 'string' ? dd.nom.trim() : '',
            items: toStringArray(dd.items),
          }
        })
        .filter(d => d.items.length > 0),
    }
  })

  return propres
    .filter(p => p.numero >= 1 && p.numero <= 5 && p.domaines.length > 0)
    .sort((a, b) => a.numero - b.numero)
}
