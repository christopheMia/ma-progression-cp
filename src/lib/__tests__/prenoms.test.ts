import { decouperPrenoms, trierPrenoms } from '../prenoms'

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

// Demande de Cecile, le 9 septembre 2026, en reponse a « qu'est-ce qui te fait
// perdre du temps » : « Il faudrait pouvoir classer la liste des eleves par
// ordre alphabetique sans perdre les elements deja notes ».
//
// Sa classe compte 24 eleves ranges dans l'ordre ou elle les a importes. Elle
// cherche donc un enfant dans une liste desordonnee, plusieurs fois par jour.
describe('trierPrenoms', () => {
  it('classe les prenoms par ordre alphabetique', () => {
    expect(trierPrenoms(['Zoe', 'Adam', 'Manon'])).toEqual(['Adam', 'Manon', 'Zoe'])
  })

  // En francais, E accent aigu se range avec E, pas apres Z. Une comparaison
  // naive sur les codes de caracteres reléguerait Émile en fin de liste, et
  // une maitresse qui cherche Émile ne le trouverait pas ou elle regarde.
  it('range les prenoms accentues a leur place francaise', () => {
    expect(trierPrenoms(['Zoe', 'Émile', 'Elodie', 'Adam'])).toEqual(['Adam', 'Elodie', 'Émile', 'Zoe'])
  })

  it('ignore la casse', () => {
    expect(trierPrenoms(['bob', 'Alice', 'CHARLIE'])).toEqual(['Alice', 'bob', 'CHARLIE'])
  })

  // Le tri ne doit rien ajouter, rien retirer, rien modifier : c'est cette
  // garantie qui fait que le suivi de chaque enfant reste attache au bon
  // enfant, l'identite se faisant par le prenom exact.
  it('ne perd, n ajoute ni ne modifie aucun prenom', () => {
    const liste = ['Zoe', 'Émile', 'Jean-Baptiste', 'Anna', 'anna']
    const trie = trierPrenoms(liste)
    expect(trie).toHaveLength(liste.length)
    expect([...trie].sort()).toEqual([...liste].sort())
  })

  it('ne modifie pas la liste d origine', () => {
    const liste = ['Zoe', 'Adam']
    trierPrenoms(liste)
    expect(liste).toEqual(['Zoe', 'Adam'])
  })

  it('accepte une liste vide', () => {
    expect(trierPrenoms([])).toEqual([])
  })
})
