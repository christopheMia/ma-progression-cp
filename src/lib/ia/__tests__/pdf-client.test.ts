const mockGetDocument = jest.fn()

jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
}))

import { assemblerLigne, extractPdfText } from '../pdf-client'

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

  test('nettoie chaque page et detruit le document meme si une page echoue', async () => {
    const cleanup = jest.fn()
    const destroy = jest.fn().mockResolvedValue(undefined)
    const erreur = new Error('page illisible')
    mockGetDocument.mockReturnValueOnce({
      promise: Promise.resolve({
        numPages: 1,
        getPage: jest.fn().mockResolvedValue({
          getTextContent: jest.fn().mockRejectedValue(erreur),
          cleanup,
        }),
        destroy,
      }),
    })
    const fichier = {
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    } as unknown as File

    await expect(extractPdfText(fichier)).rejects.toThrow('page illisible')
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(destroy).toHaveBeenCalledTimes(1)
  })
})
