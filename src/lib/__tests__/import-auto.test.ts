import fs from 'node:fs'
import path from 'node:path'
import {
  AUTO_IMPORT_JSON_SCHEMA,
  periodeDocumentImport,
  typeDocumentImport,
} from '@/lib/ia/schema-import-auto'
import { systemImportAutomatique } from '@/lib/ia/prompts'

describe('import IA automatique', () => {
  test('reconnait uniquement les trois formats acceptes', () => {
    expect(typeDocumentImport('manuel')).toBe('manuel')
    expect(typeDocumentImport('periode')).toBe('periode')
    expect(typeDocumentImport('programmation')).toBe('programmation')
    expect(typeDocumentImport('autre')).toBeNull()
  })

  test('impose les metadonnees, le type et les deux listes dans la sortie structuree', () => {
    expect(AUTO_IMPORT_JSON_SCHEMA.required).toEqual([
      'matiere',
      'nom_methode',
      'type_document',
      'periode_numero',
      'confiance_detection',
      'avertissements',
      'semaines',
      'periodes',
    ])
    expect(AUTO_IMPORT_JSON_SCHEMA.properties.type_document.enum).toEqual([
      'manuel', 'periode', 'programmation',
    ])
    expect(AUTO_IMPORT_JSON_SCHEMA.properties.periode_numero).toEqual({
      anyOf: [
        { type: 'integer' },
        { type: 'null' },
      ],
    })
    expect(AUTO_IMPORT_JSON_SCHEMA.properties.confiance_detection).toEqual({ type: 'number' })
  })

  test('valide uniquement les numeros de periode entiers de 1 a 5', () => {
    expect(periodeDocumentImport(1)).toBe(1)
    expect(periodeDocumentImport(5)).toBe(5)
    expect(periodeDocumentImport(null)).toBeNull()
    expect(periodeDocumentImport(0)).toBeNull()
    expect(periodeDocumentImport(6)).toBeNull()
    expect(periodeDocumentImport(2.5)).toBeNull()
    expect(periodeDocumentImport('2')).toBeNull()
  })

  test('detecte la matiere et la methode sans indice', () => {
    const prompt = systemImportAutomatique()
    expect(prompt).toContain('matiere')
    expect(prompt).toContain('nom_methode')
    expect(prompt).toContain('confiance_detection')
    expect(prompt).toContain('avertissements')
    expect(prompt).toContain('periode_numero')
  })

  test('corrige un indice de matiere contredit par le document', () => {
    const prompt = systemImportAutomatique('francais')
    expect(prompt).toContain('indice')
    expect(prompt).toMatch(/corrig/i)
  })

  test('explique au modele comment distinguer les trois formats', () => {
    const prompt = systemImportAutomatique()
    expect(prompt).toContain('"manuel"')
    expect(prompt).toContain('"periode"')
    expect(prompt).toContain('"programmation"')
  })

  test('le nouvel importeur garde la programmation brute sans action liee a une classe', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/methodes/SourceImporter.tsx'),
      'utf8',
    )
    expect(source).not.toContain('previsualiserProgrammation')
    expect(source).not.toContain('getPeriodesDisponibles')
    expect(source).not.toContain('setReady(false)')
  })
})
