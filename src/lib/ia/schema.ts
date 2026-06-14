import type { ProgressionSemaine } from '@/data/manuels'

/**
 * Schéma JSON imposé à l'IA (sorties structurées Anthropic).
 * Top-level objet obligatoire (un array nu n'est pas accepté).
 */
export const PROGRESSION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    semaines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          numero: { type: 'integer' },
          graphemes: { type: 'array', items: { type: 'string' } },
          pages: { type: 'string' },
          mots_exemple: { type: 'array', items: { type: 'string' } },
        },
        required: ['numero', 'graphemes', 'pages', 'mots_exemple'],
      },
    },
  },
  required: ['semaines'],
} as const

const MAX_SEMAINES = 36

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map(x => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
}

/** Nettoie/valide la progression renvoyée par l'IA et renumérote 1..N (max 36). */
export function normalizeProgression(brut: unknown[]): ProgressionSemaine[] {
  const items = Array.isArray(brut) ? brut : []
  const cleaned = items.map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>
    return {
      numero: typeof o.numero === 'number' ? o.numero : 0,
      graphemes: toStringArray(o.graphemes),
      pages: typeof o.pages === 'string' ? o.pages.trim() : '',
      mots_exemple: toStringArray(o.mots_exemple),
    }
  })
  // tri par numéro IA puis renumérotation propre 1..N
  cleaned.sort((a, b) => a.numero - b.numero)
  return cleaned.slice(0, MAX_SEMAINES).map((s, i) => ({ ...s, numero: i + 1 }))
}
