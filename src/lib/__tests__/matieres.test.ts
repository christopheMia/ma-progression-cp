import {
  codeMatiereCanonique,
  libelleMatiereCanonique,
  trouverProgressionMatiere,
} from '@/lib/matieres'

describe('codeMatiereCanonique', () => {
  test.each([
    ['Français', 'francais'],
    ['FRANCAIS', 'francais'],
    ['Lecture compréhension', 'francais'],
    ['Maths', 'maths'],
    ['Mathématiques', 'maths'],
    ['Questionner le monde', 'qlm'],
    ['QLM', 'qlm'],
    ['EPS', 'eps'],
    ['Arts visuels', 'arts'],
    ['English', 'anglais'],
    ['Langue vivante', 'anglais'],
    ['EMC', 'emc'],
  ])('transforme %s en %s', (libelle, code) => {
    expect(codeMatiereCanonique(libelle)).toBe(code)
  })

  test('produit un slug stable et non vide pour une matière inconnue', () => {
    expect(codeMatiereCanonique('Robotique créative')).toBe('robotique-creative')
    expect(codeMatiereCanonique('Robotique créative')).toBe(
      codeMatiereCanonique('ROBOTIQUE CRÉATIVE'),
    )
    expect(codeMatiereCanonique('✨')).toBe('matiere-inconnue')
  })

  test('fournit un libellé lisible pour les codes connus et inconnus', () => {
    expect(libelleMatiereCanonique('francais')).toBe('Français')
    expect(libelleMatiereCanonique('maths')).toBe('Mathématiques')
    expect(libelleMatiereCanonique('robotique-creative')).toBe('Robotique creative')
  })

  test('retrouve les progressions française et mathématique avec leurs alias', () => {
    const progression = [
      { matiere: 'francais', items: ['Son a'] },
      { matiere: 'maths', items: ['Comparer'] },
    ]

    expect(trouverProgressionMatiere(progression, 'Lecture')?.items).toEqual(['Son a'])
    expect(trouverProgressionMatiere(progression, 'Mathématiques')?.items).toEqual(['Comparer'])
  })
})
