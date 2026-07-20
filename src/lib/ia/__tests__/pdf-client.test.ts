import { assemblerLigne } from '../pdf-client'

/**
 * Coeur du correctif "l'IA ne lit pas les tableaux PDF" : une ligne de tableau
 * doit ressortir avec ses colonnes separees, pas aplatie en une suite de mots.
 */
describe('assemblerLigne (reconstruction des colonnes d\'un PDF)', () => {
  test('separe deux cellules eloignees par « | »', () => {
    const ligne = assemblerLigne([
      { x: 50, fin: 90, texte: 'Semaine 1' },
      { x: 200, fin: 260, texte: 'Lundi' },
      { x: 400, fin: 460, texte: 'Mardi' },
    ])
    expect(ligne).toBe('Semaine 1 | Lundi | Mardi')
  })

  test('garde les mots d\'une meme cellule sur la meme colonne', () => {
    const ligne = assemblerLigne([
      { x: 50, fin: 80, texte: 'geste' },
      { x: 83, fin: 120, texte: "d'ecriture" },
    ])
    expect(ligne).toBe("geste d'ecriture")
  })

  test('remet les fragments dans l\'ordre horizontal', () => {
    const ligne = assemblerLigne([
      { x: 400, fin: 460, texte: 'Mardi' },
      { x: 50, fin: 90, texte: 'Semaine 1' },
    ])
    expect(ligne).toBe('Semaine 1 | Mardi')
  })

  test('une cellule vide ne casse pas la ligne', () => {
    expect(assemblerLigne([])).toBe('')
  })
})
