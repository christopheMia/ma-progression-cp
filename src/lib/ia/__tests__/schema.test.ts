import { normalizeProgression, PROGRESSION_JSON_SCHEMA } from '../schema'

describe('normalizeProgression', () => {
  test('renumérote les semaines de 1 à N dans l’ordre', () => {
    const out = normalizeProgression([
      { numero: 5, items: ['a'], pages: 'p.10', mots_exemple: ['ananas'] },
      { numero: 2, items: ['i'], pages: 'p.14', mots_exemple: [] },
    ])
    expect(out.map(s => s.numero)).toEqual([1, 2])
  })

  test('coupe à 36 semaines maximum', () => {
    const brut = Array.from({ length: 50 }, (_, i) => ({
      numero: i + 1, items: ['a'], pages: '', mots_exemple: [],
    }))
    expect(normalizeProgression(brut)).toHaveLength(36)
  })

  test('nettoie les champs manquants ou invalides', () => {
    const out = normalizeProgression([
      { numero: 1, items: null, pages: undefined },
    ])
    expect(out[0]).toEqual({ numero: 1, items: [], pages: '', mots_exemple: [] })
  })

  test('filtre les items vides et trim', () => {
    const out = normalizeProgression([
      { numero: 1, items: [' a ', '', 'ou'], pages: ' p.10 ', mots_exemple: [' ami ', ''] },
    ])
    expect(out[0].items).toEqual(['a', 'ou'])
    expect(out[0].pages).toBe('p.10')
    expect(out[0].mots_exemple).toEqual(['ami'])
  })

  test('le schéma JSON cible un objet { semaines: [...] } avec items', () => {
    expect(PROGRESSION_JSON_SCHEMA.type).toBe('object')
    expect(PROGRESSION_JSON_SCHEMA.properties.semaines.type).toBe('array')
    expect(PROGRESSION_JSON_SCHEMA.properties.semaines.items.properties).toHaveProperty('items')
  })
})
