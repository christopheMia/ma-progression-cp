import { libelleContenuSemaine } from '@/lib/semaines'

describe('libelleContenuSemaine', () => {
  test('reste vide sans donnée utilisateur', () => {
    expect(libelleContenuSemaine([])).toBeNull()
    expect(libelleContenuSemaine(['', '   '])).toBeNull()
  })

  test('conserve les contenus réellement saisis', () => {
    expect(libelleContenuSemaine(['Son a', 'Écriture a'])).toBe('Son a, Écriture a')
  })
})
