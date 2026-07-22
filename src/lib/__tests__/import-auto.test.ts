import fs from 'node:fs'
import path from 'node:path'
import { AUTO_IMPORT_JSON_SCHEMA, typeDocumentImport } from '@/lib/ia/schema-import-auto'
import { systemImportAutomatique } from '@/lib/ia/prompts'

describe('import IA automatique', () => {
  test('reconnait uniquement les trois formats acceptes', () => {
    expect(typeDocumentImport('manuel')).toBe('manuel')
    expect(typeDocumentImport('periode')).toBe('periode')
    expect(typeDocumentImport('programmation')).toBe('programmation')
    expect(typeDocumentImport('autre')).toBeNull()
  })

  test('impose le type et les deux listes dans la sortie structuree', () => {
    expect(AUTO_IMPORT_JSON_SCHEMA.required).toEqual(['type_document', 'semaines', 'periodes'])
    expect(AUTO_IMPORT_JSON_SCHEMA.properties.type_document.enum).toEqual([
      'manuel', 'periode', 'programmation',
    ])
  })

  test('explique au modele comment distinguer les formats', () => {
    const prompt = systemImportAutomatique('francais')
    expect(prompt).toContain('"manuel"')
    expect(prompt).toContain('"periode"')
    expect(prompt).toContain('"programmation"')
  })

  test('le formulaire ne demande plus de choisir le type avant analyse', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/setup/IaImport.tsx'),
      'utf8',
    )
    expect(source).not.toContain('name="type-document"')
    expect(source).not.toContain("form.append('mode'")
    expect(source).toContain('Document reconnu')
  })
})
