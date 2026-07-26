import {
  AUTO_IMPORT_JSON_SCHEMA,
  baseCalageImport,
  BASES_CALAGE,
} from '../schema-import-auto'

describe('base de calage', () => {
  test('le schéma structuré impose une base de calage', () => {
    expect(AUTO_IMPORT_JSON_SCHEMA.properties).toHaveProperty('base_calage')
    expect(AUTO_IMPORT_JSON_SCHEMA.required).toContain('base_calage')
    // Doit rester aligné avec BaseCalage dans src/lib/calage-semaines.ts.
    expect(BASES_CALAGE).toEqual(['numeros', 'dates', 'ordre'])
  })

  test('une base inconnue retombe sur le calage par ordre', () => {
    expect(baseCalageImport('numeros')).toBe('numeros')
    expect(baseCalageImport('dates')).toBe('dates')
    expect(baseCalageImport('n’importe quoi')).toBe('ordre')
    expect(baseCalageImport(undefined)).toBe('ordre')
  })
})
