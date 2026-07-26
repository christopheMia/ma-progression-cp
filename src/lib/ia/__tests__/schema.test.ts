import { normalizeProgression, numerosSemainesFiables, PROGRESSION_JSON_SCHEMA } from '../schema'

describe('normalizeProgression', () => {
  test('conserve les numéros de semaine rendus par l’IA, en les triant', () => {
    // Renuméroter détruisait le calage : un manuel commençant en semaine 2
    // remontait en semaine 1 et toute l'année se décalait d'un cran.
    const out = normalizeProgression([
      { numero: 5, items: ['a'], pages: 'p.10', mots_exemple: ['ananas'] },
      { numero: 2, items: ['i'], pages: 'p.14', mots_exemple: [] },
    ])
    expect(out.map(s => s.numero)).toEqual([2, 5])
  })

  test('retombe sur l’ordre de la liste quand un numéro est inutilisable', () => {
    const out = normalizeProgression([
      { numero: 0, items: ['a'], pages: '', mots_exemple: [] },
      { numero: 99, items: ['i'], pages: '', mots_exemple: [] },
    ])
    expect(out.map(s => s.numero)).toEqual([1, 2])
    expect(numerosSemainesFiables([
      { numero: 0, items: ['a'], pages: '', mots_exemple: [] },
    ])).toBe(false)
  })

  test('fusionne les lignes qui portent le même numéro de semaine', () => {
    // Bug du 26/07 : les documents de maths listent souvent trois lignes pour
    // une même semaine (une par domaine, ou une par séance). L'IA rendait alors
    // trois objets « semaine 1 », et la progression affichait trois séances par
    // semaine au lieu d'une. Une semaine du document = une semaine de l'année.
    const out = normalizeProgression([
      { numero: 1, items: ['Nombres jusqu’à 10'], pages: 'p.4', mots_exemple: [] },
      { numero: 1, items: ['Comparer deux collections'], pages: 'p.5', mots_exemple: [] },
      { numero: 1, items: ['Se repérer dans l’espace'], pages: '', mots_exemple: [] },
      { numero: 2, items: ['Ajouter'], pages: 'p.8', mots_exemple: [] },
    ])

    expect(out.map(s => s.numero)).toEqual([1, 2])
    expect(out[0].items).toEqual([
      'Nombres jusqu’à 10', 'Comparer deux collections', 'Se repérer dans l’espace',
    ])
    expect(out[0].pages).toBe('p.4, p.5')
  })

  test('la fusion ne recopie pas deux fois le même apprentissage', () => {
    const out = normalizeProgression([
      { numero: 3, items: ['Le son [a]'], pages: 'p.12', mots_exemple: ['ami'] },
      { numero: 3, items: ['Le son [a]', 'Écriture du a'], pages: 'p.12', mots_exemple: ['ami', 'abri'] },
    ])

    expect(out).toHaveLength(1)
    expect(out[0].items).toEqual(['Le son [a]', 'Écriture du a'])
    expect(out[0].pages).toBe('p.12')
    expect(out[0].mots_exemple).toEqual(['ami', 'abri'])
  })

  test('les 36 semaines sont comptées APRÈS fusion, pas avant', () => {
    // Sinon un document de 36 semaines ecrit sur trois lignes chacune se
    // retrouvait ampute des deux tiers de l'annee.
    const brut = Array.from({ length: 36 }, (_, i) => i + 1).flatMap(numero => [
      { numero, items: [`a${numero}`], pages: '', mots_exemple: [] },
      { numero, items: [`b${numero}`], pages: '', mots_exemple: [] },
      { numero, items: [`c${numero}`], pages: '', mots_exemple: [] },
    ])

    const out = normalizeProgression(brut)
    expect(out).toHaveLength(36)
    expect(out[35].numero).toBe(36)
    expect(out[35].items).toEqual(['a36', 'b36', 'c36'])
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
