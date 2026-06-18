import { MATIERES_METHODE, LABELS_MATIERE, isMatiereMethode } from '../matieres'

describe('matieres methode', () => {
  test('les 2 matières importables sont francais et maths', () => {
    expect(MATIERES_METHODE).toEqual(['francais', 'maths'])
  })
  test('chaque matière a un libellé lisible', () => {
    expect(LABELS_MATIERE.francais).toBe('Français')
    expect(LABELS_MATIERE.maths).toBe('Maths')
  })
  test('isMatiereMethode valide les bonnes valeurs', () => {
    expect(isMatiereMethode('francais')).toBe(true)
    expect(isMatiereMethode('eps')).toBe(false)
  })
})
