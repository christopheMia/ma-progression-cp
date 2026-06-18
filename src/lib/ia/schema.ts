import type { ProgressionSemaine } from '@/data/manuels'

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
          items: { type: 'array', items: { type: 'string' } },
          pages: { type: 'string' },
          mots_exemple: { type: 'array', items: { type: 'string' } },
        },
        required: ['numero', 'items', 'pages', 'mots_exemple'],
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

export function normalizeProgression(brut: unknown[]): ProgressionSemaine[] {
  const items = Array.isArray(brut) ? brut : []
  const cleaned = items.map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>
    return {
      numero: typeof o.numero === 'number' ? o.numero : 0,
      items: toStringArray(o.items),
      pages: typeof o.pages === 'string' ? o.pages.trim() : '',
      mots_exemple: toStringArray(o.mots_exemple),
    }
  })
  cleaned.sort((a, b) => a.numero - b.numero)
  return cleaned.slice(0, MAX_SEMAINES).map((s, i) => ({ ...s, numero: i + 1 }))
}
