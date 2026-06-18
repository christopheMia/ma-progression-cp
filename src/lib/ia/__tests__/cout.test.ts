import { estimerCoutEuros, PLAFOND_EUROS } from '../cout'

describe('estimerCoutEuros (tarif Sonnet)', () => {
  test('1M input + 1M output ≈ (3$+15$) convertis en euros', () => {
    const eur = estimerCoutEuros(1_000_000, 1_000_000)
    expect(eur).toBeGreaterThan(14)
    expect(eur).toBeLessThan(18)
  })
  test('0 token = 0 €', () => {
    expect(estimerCoutEuros(0, 0)).toBe(0)
  })
  test('le plafond est défini', () => {
    expect(PLAFOND_EUROS).toBeGreaterThan(0)
  })
})
