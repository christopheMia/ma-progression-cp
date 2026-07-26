import {
  contraindre,
  estGlissement,
  lirePositionMemorisee,
  SEUIL_GLISSEMENT_PX,
} from '../position-flottante'

describe('estGlissement', () => {
  test('un micro-mouvement reste un clic', () => {
    // Sans ce seuil, le panneau s'ouvrirait des qu'on essaie de deplacer le
    // bouton, et il deviendrait impossible a bouger.
    expect(estGlissement({ x: 100, y: 100 }, { x: 102, y: 101 })).toBe(false)
  })

  test('au-dela du seuil, l’intention est de déplacer', () => {
    expect(estGlissement({ x: 100, y: 100 }, { x: 100 + SEUIL_GLISSEMENT_PX, y: 100 }))
      .toBe(true)
    expect(estGlissement({ x: 100, y: 100 }, { x: 90, y: 130 })).toBe(true)
  })
})

describe('contraindre', () => {
  const taille = { largeur: 44, hauteur: 44 }
  const fenetre = { largeur: 1000, hauteur: 800 }

  test('laisse une position déjà valide intacte', () => {
    expect(contraindre({ x: 300, y: 200 }, taille, fenetre)).toEqual({ x: 300, y: 200 })
  })

  test('ramène le bouton dans la fenêtre s’il déborde', () => {
    expect(contraindre({ x: 5000, y: 5000 }, taille, fenetre)).toEqual({ x: 948, y: 748 })
    expect(contraindre({ x: -200, y: -200 }, taille, fenetre)).toEqual({ x: 8, y: 8 })
  })

  test('sur une fenêtre plus petite que le bouton, colle au bord au lieu de sortir', () => {
    expect(contraindre({ x: 100, y: 100 }, taille, { largeur: 20, hauteur: 20 }))
      .toEqual({ x: 8, y: 8 })
  })
})

describe('lirePositionMemorisee', () => {
  test('relit une position enregistrée', () => {
    expect(lirePositionMemorisee('{"x":120,"y":340}')).toEqual({ x: 120, y: 340 })
  })

  test('rend null quand rien n’est enregistré ou que la valeur est abîmée', () => {
    expect(lirePositionMemorisee(null)).toBeNull()
    expect(lirePositionMemorisee('')).toBeNull()
    expect(lirePositionMemorisee('pas du json')).toBeNull()
    expect(lirePositionMemorisee('{"x":"gauche","y":10}')).toBeNull()
    expect(lirePositionMemorisee('{"x":null,"y":10}')).toBeNull()
  })
})
