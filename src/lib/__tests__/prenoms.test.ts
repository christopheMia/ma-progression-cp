import { decouperPrenoms } from '../prenoms'

describe('decouperPrenoms', () => {
  test('une liste collée un prénom par ligne', () => {
    expect(decouperPrenoms('Emmanuel\nElena\nLéonor')).toEqual(['Emmanuel', 'Elena', 'Léonor'])
  })

  test('des prénoms séparés par des virgules', () => {
    expect(decouperPrenoms('Paul, Marie , Zoé')).toEqual(['Paul', 'Marie', 'Zoé'])
  })

  test('mélange de séparateurs et lignes vides', () => {
    expect(decouperPrenoms('Paul,\n\nMarie;Zoé\n')).toEqual(['Paul', 'Marie', 'Zoé'])
  })

  test('gère les retours chariot Windows', () => {
    expect(decouperPrenoms('Paul\r\nMarie')).toEqual(['Paul', 'Marie'])
  })

  test('un seul prénom reste un seul prénom', () => {
    expect(decouperPrenoms('Emmanuel')).toEqual(['Emmanuel'])
  })

  test('un texte vide ou blanc ne donne aucun prénom', () => {
    expect(decouperPrenoms('')).toEqual([])
    expect(decouperPrenoms('  \n , ; ')).toEqual([])
  })

  test('conserve les prénoms composés (le tiret n\'est pas un séparateur)', () => {
    expect(decouperPrenoms('Jean-Paul\nAnne-Marie')).toEqual(['Jean-Paul', 'Anne-Marie'])
  })
})
