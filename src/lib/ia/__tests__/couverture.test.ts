import { notionsManquantes } from '../couverture'

describe('notionsManquantes', () => {
  test('aucune manquante quand tout est place', () => {
    const ref = ['Nombres jusqu a 10', 'Monnaie']
    const placees = [
      { numero: 1, items: ['Nombres jusqu a 10'] },
      { numero: 2, items: ['Monnaie', 'autre'] },
    ]
    expect(notionsManquantes(ref, placees)).toEqual([])
  })

  test('detecte les notions de reference non placees', () => {
    const ref = ['Nombres jusqu a 10', 'Monnaie', 'Solides']
    const placees = [{ numero: 1, items: ['Nombres jusqu a 10'] }]
    expect(notionsManquantes(ref, placees)).toEqual(['Monnaie', 'Solides'])
  })

  test('comparaison insensible a la casse et aux espaces', () => {
    const ref = ['Monnaie']
    const placees = [{ numero: 1, items: ['  monnaie '] }]
    expect(notionsManquantes(ref, placees)).toEqual([])
  })
})
