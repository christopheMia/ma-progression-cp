import { genererProgressionFrancais } from '../progression'

describe('genererProgressionFrancais', () => {
  it('transporte les séances jusqu’aux lignes à écrire en base', () => {
    const lignes = genererProgressionFrancais('import', [
      {
        numero: 1, items: ['Jour 1 : Graphème A'], pages: 'p.4', mots_exemple: [],
        seances: [{ jour: 1, domaine: '', libelle: 'Graphème A' }],
      },
    ])
    expect(lignes[0].seances).toEqual([{ jour: 1, domaine: '', libelle: 'Graphème A' }])
  })

  it('rend un tableau vide quand la semaine n’a pas de séances', () => {
    const lignes = genererProgressionFrancais('import', [
      { numero: 1, items: ['Nombres jusqu’à 10'], pages: '', mots_exemple: [] },
    ])
    expect(lignes[0].seances).toEqual([])
  })
})
