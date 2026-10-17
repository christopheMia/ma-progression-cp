import { contenuSemaine } from '../contenu-semaine'

describe('contenuSemaine', () => {
  test('range les séances par jour, le domaine à part', () => {
    const groupes = contenuSemaine([
      'Jour 1 : Graphèmes e et é (phono, lecture)',
      'Jour 1 : Langage oral : Voyelles de Rimbaud (S4)',
      'Jour 2 : Vocabulaire (S8)',
      'Jour 4 : LC : Texte au choix',
    ])
    expect(groupes).toEqual([
      { jour: 1, entrees: [
        { domaine: '', texte: 'Graphèmes e et é (phono, lecture)' },
        { domaine: 'Langage oral', texte: 'Voyelles de Rimbaud (S4)' },
      ] },
      { jour: 2, entrees: [{ domaine: '', texte: 'Vocabulaire (S8)' }] },
      { jour: 4, entrees: [{ domaine: 'LC', texte: 'Texte au choix' }] },
    ])
  })

  test('sans jours, une seule liste ; le texte après le domaine reste entier', () => {
    expect(contenuSemaine([
      'Poésie : Poésie sur la rentrée : Trois escargots de Maurice Carême',
      'Numération : Groupements par 5',
    ])).toEqual([
      { jour: null, entrees: [
        { domaine: 'Poésie', texte: 'Poésie sur la rentrée : Trois escargots de Maurice Carême' },
        { domaine: 'Numération', texte: 'Groupements par 5' },
      ] },
    ])
  })

  test('les jours sont triés et ce qui n’a pas de jour passe à la fin', () => {
    const groupes = contenuSemaine(['Jour 3 : A', 'Révisions', 'Jour 1 : B'])
    expect(groupes.map(g => g.jour)).toEqual([1, 3, null])
  })

  test('la forme longue du domaine est abrégée comme dans le cahier journal', () => {
    const [groupe] = contenuSemaine(['Jour 2 : Lecture compréhension : La petite poule'])
    expect(groupe.entrees[0]).toEqual({ domaine: 'LC', texte: 'La petite poule' })
  })

  test('entrées vides ou absentes : aucun groupe', () => {
    expect(contenuSemaine(null)).toEqual([])
    expect(contenuSemaine(['', '  '])).toEqual([])
  })
})
