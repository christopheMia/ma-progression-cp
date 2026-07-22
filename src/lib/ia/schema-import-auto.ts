import { PROGRESSION_JSON_SCHEMA } from '@/lib/ia/schema'
import { PROGRAMMATION_JSON_SCHEMA } from '@/lib/ia/schema-programmation'

export const TYPES_DOCUMENT_IMPORT = ['manuel', 'periode', 'programmation'] as const
export type TypeDocumentImport = typeof TYPES_DOCUMENT_IMPORT[number]

/**
 * Une seule sortie structuree pour les trois documents acceptes. Le modele
 * identifie d'abord le document, puis remplit uniquement la liste adaptee.
 */
export const AUTO_IMPORT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type_document: { type: 'string', enum: TYPES_DOCUMENT_IMPORT },
    semaines: PROGRESSION_JSON_SCHEMA.properties.semaines,
    periodes: PROGRAMMATION_JSON_SCHEMA.properties.periodes,
  },
  required: ['type_document', 'semaines', 'periodes'],
} as const

export function typeDocumentImport(value: unknown): TypeDocumentImport | null {
  return TYPES_DOCUMENT_IMPORT.includes(value as TypeDocumentImport)
    ? value as TypeDocumentImport
    : null
}
