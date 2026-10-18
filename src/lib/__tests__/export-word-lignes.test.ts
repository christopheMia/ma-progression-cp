import { paragraphesDe } from '../export-word'

jest.mock('file-saver', () => ({ saveAs: jest.fn() }))

// Relecture du 17/10/2026 : une case portant plusieurs notions, une par ligne,
// s'exportait collée sur une seule ligne dans le document Word.
describe('export Word : une ligne du cahier journal, un paragraphe', () => {
  it('découpe le texte aux retours à la ligne', () => {
    expect(paragraphesDe('Numération : 10\nProblèmes : égalisation\nCalcul mental : doubles')).toHaveLength(3)
  })

  it('un texte sans retour à la ligne reste un seul paragraphe', () => {
    expect(paragraphesDe('Anglais')).toHaveLength(1)
  })
})
