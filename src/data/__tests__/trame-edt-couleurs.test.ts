import { couleurMatiere, couleurAffichee, COULEURS_FAMILLE } from '../trame-edt'

const C = COULEURS_FAMILLE

describe('couleurMatiere : une couleur par famille, pas par libellé', () => {
  test.each([
    // Français, tous libellés confondus (manuel, trame, EDT de Cecile).
    ['Appropriation des graphèmes', C.francais],
    ['Geste d\'écriture', C.francais],
    ['Phonologie encodage décodage', C.francais],
    ['Ateliers de français', C.francais],
    ['Étude de la langue : vocabulaire ou grammaire', C.francais],
    ['Lecture compréhension', C.francais],
    ["Production d'écrits", C.francais],
    ['Chut je lis', C.francais],
    ['Fluence', C.francais],
    ['Langage oral', C.francais],
    ['Rituel poésie', C.francais],
    ['LC : La petite poule qui voulait voir la mer', C.francais],

    ['Mathématiques', C.maths],
    ['Calcul mental', C.maths],
    ['Problème', C.maths],
    ['Chaque jour compte', C.maths],
    ['Grandeurs et mesures', C.maths],

    ['Questionner le monde', C.qlm],
    ['Histoire géographie', C.qlm],
    ['Sciences et technologie', C.qlm],

    ['EPS', C.eps],
    ['Education physique et sportive', C.eps],
    ['Natation', C.eps],

    ['Arts visuels', C.arts],
    ['Arts plastiques', C.arts],
    ['Enseignements artistiques', C.arts],
    ['Musique', C.arts],

    ['Anglais', C.langueVivante],
    ['Langue vivante (anglais)', C.langueVivante],

    ['EMC', C.emc],
    ['Enseignement moral et civique', C.emc],

    ['Récréation', C.routine],
    ['Pause dejeuner / cantine', C.routine],
    ['Accueil dans la cour', C.routine],
    ['Bilan de la journée, cartable', C.routine],
  ])('%s', (libelle, attendu) => {
    expect(couleurMatiere(libelle)).toBe(attendu)
  })

  test('les libellés sans accents (générateur) donnent la même couleur', () => {
    expect(couleurMatiere('Mathematiques')).toBe(couleurMatiere('Mathématiques'))
    expect(couleurMatiere('Education physique et sportive'))
      .toBe(couleurMatiere('Éducation physique et sportive'))
    expect(couleurMatiere('Etude du code (lecture, graphemes)'))
      .toBe(couleurMatiere('Étude du code (lecture, graphèmes)'))
  })

  describe('pièges d\'ordre entre familles', () => {
    test('« histoire des arts » est des arts, pas questionner le monde', () => {
      expect(couleurMatiere('Histoire des arts')).toBe(C.arts)
      expect(couleurMatiere('Histoire géographie')).toBe(C.qlm)
    })

    test('« étude de la langue » est du français, « langue vivante » non', () => {
      expect(couleurMatiere('Étude de la langue')).toBe(C.francais)
      expect(couleurMatiere('Langue vivante (anglais)')).toBe(C.langueVivante)
    })

    test('« enseignements artistiques » n\'est pas capté par l\'EMC', () => {
      expect(couleurMatiere('Enseignements artistiques')).toBe(C.arts)
      expect(couleurMatiere('Enseignement moral et civique')).toBe(C.emc)
    })
  })

  test('une matière inconnue reste neutre plutôt que colorée au hasard', () => {
    expect(couleurMatiere('Réunion avec la directrice')).toBeNull()
  })
})

describe('couleurAffichee : le choix de l\'enseignante gagne toujours', () => {
  test('la couleur enregistrée l\'emporte sur la palette', () => {
    expect(couleurAffichee({ matiere: 'Mathématiques', couleur: '#ff0000' })).toBe('#ff0000')
  })

  test('sans couleur enregistrée, la palette prend le relais', () => {
    expect(couleurAffichee({ matiere: 'Sciences et technologie', couleur: null })).toBe(C.qlm)
  })

  test('un créneau de routine sans couleur reçoit le gris', () => {
    expect(couleurAffichee({ matiere: 'Intervention infirmière', couleur: null, type: 'routine' }))
      .toBe(C.routine)
  })

  test('une matière inconnue sans couleur reste neutre', () => {
    expect(couleurAffichee({ matiere: 'Réunion avec la directrice', couleur: null })).toBeNull()
  })
})
