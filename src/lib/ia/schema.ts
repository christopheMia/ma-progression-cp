import type { ProgressionSemaine } from '@/data/manuels'

// Anthropic exige un OBJET racine pour les sorties structurées (un array nu est
// refusé) : on enveloppe la liste des semaines dans { semaines: [...] }.
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

function nettoyerSemainesBrutes(brut: unknown[]): ProgressionSemaine[] {
  const items = Array.isArray(brut) ? brut : []
  return items.map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>
    return {
      numero: typeof o.numero === 'number' ? o.numero : 0,
      items: toStringArray(o.items),
      pages: typeof o.pages === 'string' ? o.pages.trim() : '',
      mots_exemple: toStringArray(o.mots_exemple),
    }
  })
}

/** Concatene en gardant l'ordre et sans repeter une valeur deja presente. */
function fusionnerListes(a: string[], b: string[]): string[] {
  const out = [...a]
  for (const v of b) if (!out.includes(v)) out.push(v)
  return out
}

/**
 * Regroupe les lignes qui portent le MEME numero de semaine.
 *
 * Les documents de maths, et beaucoup de programmations par periode, decrivent
 * une semaine sur plusieurs lignes : une par domaine (« Nombres », « Calcul »,
 * « Espace ») ou une par seance. Sans regroupement, l'application affichait
 * trois seances pour la semaine 1 au lieu d'une (retour du 26/07), et le
 * plafond de 36 amputait les deux tiers de l'annee.
 *
 * Une semaine du document reste une semaine de l'annee : ses apprentissages
 * s'additionnent dans l'ordre de lecture.
 */
function fusionnerParNumero(semaines: ProgressionSemaine[]): ProgressionSemaine[] {
  const parNumero = new Map<number, ProgressionSemaine>()
  for (const s of semaines) {
    const deja = parNumero.get(s.numero)
    if (!deja) {
      parNumero.set(s.numero, { ...s })
      continue
    }
    deja.items = fusionnerListes(deja.items, s.items)
    deja.mots_exemple = fusionnerListes(deja.mots_exemple, s.mots_exemple)
    // Les pages s'accumulent : « p.4, p.5 » dit ou chercher les deux domaines.
    const pages = fusionnerListes(
      deja.pages ? deja.pages.split(', ') : [],
      s.pages ? s.pages.split(', ') : [],
    )
    deja.pages = pages.join(', ')
  }
  return [...parNumero.values()]
}

/**
 * Vrai quand TOUS les numeros rendus par l'IA sont des semaines plausibles
 * (entiers de 1 a 36). Dans ce cas seulement ils peuvent servir au calage.
 * Sinon le calage ne repose que sur l'ordre de la liste, ce que l'ecran doit
 * dire franchement a l'enseignante.
 */
export function numerosSemainesFiables(brut: unknown[]): boolean {
  const cleaned = nettoyerSemainesBrutes(brut)
  if (cleaned.length === 0) return false
  return cleaned.every(s =>
    Number.isInteger(s.numero) && s.numero >= 1 && s.numero <= MAX_SEMAINES)
}

/**
 * Nettoie les semaines rendues par l'IA SANS toucher a leur numero quand il est
 * utilisable. Renumeroter detruisait l'information « ce manuel commence en
 * semaine 2 », donc decalait toute l'annee d'un cran : un sommaire qui laisse la
 * semaine de la rentree a l'accueil voyait son premier son remonter en semaine 1.
 * Le placement reel dans l'annee appartient a src/lib/calage-semaines.ts.
 */
export function normalizeProgression(brut: unknown[]): ProgressionSemaine[] {
  const cleaned = nettoyerSemainesBrutes(brut)
  if (!numerosSemainesFiables(brut)) {
    // Aucun numero exploitable : on numerote dans l'ordre recu.
    return cleaned.slice(0, MAX_SEMAINES).map((s, i) => ({ ...s, numero: i + 1 }))
  }
  // Fusion AVANT le plafond : sinon un document ecrit sur trois lignes par
  // semaine perdait les deux tiers de son annee.
  return fusionnerParNumero(cleaned)
    .sort((a, b) => a.numero - b.numero)
    .slice(0, MAX_SEMAINES)
}
