import { PROGRESSION_JSON_SCHEMA } from '@/lib/ia/schema'
import { PROGRAMMATION_JSON_SCHEMA } from '@/lib/ia/schema-programmation'

export const TYPES_DOCUMENT_IMPORT = ['manuel', 'periode', 'programmation'] as const
export type TypeDocumentImport = typeof TYPES_DOCUMENT_IMPORT[number]

/**
 * Sur quoi l'IA s'est appuyee pour numeroter les semaines. C'est ce qui permet
 * a l'ecran d'etre honnete sur son niveau de certitude au lieu de faire croire
 * a un calage sur.
 *
 * Doit rester aligne avec BaseCalage dans src/lib/calage-semaines.ts.
 */
export const BASES_CALAGE = ['numeros', 'dates', 'ordre'] as const
export type BaseCalageImport = typeof BASES_CALAGE[number]

/**
 * Une seule sortie structuree pour les trois documents acceptes. Le modele
 * identifie d'abord le document, puis remplit uniquement la liste adaptee.
 */
export const AUTO_IMPORT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    matiere: { type: 'string' },
    nom_methode: { type: 'string' },
    type_document: { type: 'string', enum: TYPES_DOCUMENT_IMPORT },
    periode_numero: {
      anyOf: [
        { type: 'integer' },
        { type: 'null' },
      ],
    },
    confiance_detection: { type: 'number' },
    // Un avertissement qui ne dit pas OU est le probleme est inutilisable :
    // l'enseignante ne peut pas corriger ce qu'elle ne peut pas situer.
    avertissements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          semaine: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
          message: { type: 'string' },
        },
        required: ['semaine', 'message'],
      },
    },
    base_calage: { type: 'string', enum: BASES_CALAGE },
    semaines: PROGRESSION_JSON_SCHEMA.properties.semaines,
    periodes: PROGRAMMATION_JSON_SCHEMA.properties.periodes,
  },
  required: [
    'matiere',
    'nom_methode',
    'type_document',
    'periode_numero',
    'confiance_detection',
    'avertissements',
    'base_calage',
    'semaines',
    'periodes',
  ],
} as const

export function typeDocumentImport(value: unknown): TypeDocumentImport | null {
  return TYPES_DOCUMENT_IMPORT.includes(value as TypeDocumentImport)
    ? value as TypeDocumentImport
    : null
}

/** Avertissement situe : `semaine` vaut null quand il porte sur tout le document. */
export type AvertissementImport = { semaine: number | null; message: string }

export function avertissementsImport(value: unknown): AvertissementImport[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(brut => {
    // Tolerance : l'IA peut encore rendre une simple chaine.
    if (typeof brut === 'string') {
      return brut.trim() ? [{ semaine: null, message: brut.trim() }] : []
    }
    if (typeof brut !== 'object' || brut === null) return []
    const item = brut as Record<string, unknown>
    const message = typeof item.message === 'string' ? item.message.trim() : ''
    if (!message) return []
    const semaine = typeof item.semaine === 'number' && Number.isInteger(item.semaine)
      && item.semaine >= 1 && item.semaine <= 36
      ? item.semaine
      : null
    return [{ semaine, message }]
  })
}

export function baseCalageImport(value: unknown): BaseCalageImport {
  return BASES_CALAGE.includes(value as BaseCalageImport)
    ? value as BaseCalageImport
    : 'ordre'
}

export function periodeDocumentImport(value: unknown): 1 | 2 | 3 | 4 | 5 | null {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= 1
    && value <= 5
    ? value as 1 | 2 | 3 | 4 | 5
    : null
}
