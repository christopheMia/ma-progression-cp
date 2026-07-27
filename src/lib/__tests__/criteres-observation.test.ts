import { cleObservation, normaliserLibelleCritere } from '../criteres-observation'

describe('critères d’observation', () => {
  test('normalise un libellé sans en changer le sens', () => {
    expect(normaliserLibelleCritere('  explique   sa démarche  ')).toBe('explique sa démarche')
  })

  test('refuse un critère vide ou démesuré', () => {
    expect(() => normaliserLibelleCritere('   ')).toThrow(/écris le critère/i)
    expect(() => normaliserLibelleCritere('x'.repeat(181))).toThrow(/180 caractères/i)
  })

  test('isole la coche de chaque élève et de chaque critère', () => {
    expect(cleObservation('eleve-1', 'critere-2')).toBe('eleve-1|critere-2')
  })
})

