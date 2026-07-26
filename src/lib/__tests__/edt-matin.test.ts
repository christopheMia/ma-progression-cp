import {
  corrigerPrioriteMatin,
  matiereImposeeLeMatin,
} from '../edt-matin'
import { TRAME_EDT_CP } from '@/data/trame-edt'

type CreneauTest = {
  jour: string
  heure_debut: string
  heure_fin: string
  matiere: string
  type: 'cours' | 'routine'
  ordre: number
  note?: string
}

const creneau = (
  jour: string,
  heure_debut: string,
  heure_fin: string,
  matiere: string,
  ordre: number,
  note?: string,
): CreneauTest => ({
  jour,
  heure_debut,
  heure_fin,
  matiere,
  type: 'cours',
  ordre,
  note,
})

describe('matiereImposeeLeMatin', () => {
  test.each([
    ['Mathématiques', 'mathematiques'],
    ['Calcul mental', 'mathematiques'],
    ['Appropriation des graphèmes', 'code'],
    ['Phonologie, encodage et décodage', 'code'],
    ['Étude de la langue', 'etude-langue'],
    ['Grammaire et orthographe', 'etude-langue'],
    ['Vocabulaire', 'etude-langue'],
  ])('reconnait %s comme %s', (matiere, attendu) => {
    expect(matiereImposeeLeMatin(matiere)).toBe(attendu)
  })

  test.each([
    'Lecture compréhension',
    'Production d’écrits',
    'Écriture',
    'Questionner le monde',
    'Arts visuels',
    'Anglais',
  ])('ne déduit pas une matière imposée du libellé %s', matiere => {
    expect(matiereImposeeLeMatin(matiere)).toBeNull()
  })
})

describe('corrigerPrioriteMatin', () => {
  test('conserve un EDT déjà conforme sans muter les données', () => {
    const entree = [
      creneau('lundi', '09:00', '10:00', 'Mathématiques', 0, 'à préserver'),
      creneau('lundi', '14:00', '15:00', 'Arts visuels', 1),
    ]
    const copie = structuredClone(entree)

    const resultat = corrigerPrioriteMatin(entree)

    expect(resultat).toEqual({
      ok: true,
      creneaux: entree,
      modifie: false,
      deplacements: [],
    })
    expect(entree).toEqual(copie)
  })

  test.each([
    ['Mathématiques', 'Arts visuels'],
    ['Phonologie', 'Questionner le monde'],
    ['Vocabulaire', 'Anglais'],
  ])('remet %s le matin à la place de %s', (imposee, autre) => {
    const resultat = corrigerPrioriteMatin([
      creneau('lundi', '09:00', '10:00', autre, 0, 'matin'),
      creneau('mardi', '14:00', '15:00', imposee, 1, 'après-midi'),
    ])

    expect(resultat.ok).toBe(true)
    if (!resultat.ok) return
    expect(resultat.modifie).toBe(true)
    expect(resultat.creneaux).toEqual(expect.arrayContaining([
      expect.objectContaining({
        jour: 'lundi',
        heure_debut: '09:00',
        heure_fin: '10:00',
        matiere: imposee,
        ordre: 0,
        note: 'après-midi',
      }),
      expect.objectContaining({
        jour: 'mardi',
        heure_debut: '14:00',
        heure_fin: '15:00',
        matiere: autre,
        ordre: 1,
        note: 'matin',
      }),
    ]))
  })

  test('utilise la pause déjeuner réelle comme limite du matin', () => {
    const resultat = corrigerPrioriteMatin([
      creneau('lundi', '11:45', '12:15', 'Arts visuels', 0),
      {
        ...creneau('lundi', '12:15', '13:15', 'Pause déjeuner', 1),
        type: 'routine',
      },
      creneau('lundi', '13:15', '13:45', 'Mathématiques', 2),
    ])

    expect(resultat.ok).toBe(true)
    if (!resultat.ok) return
    expect(resultat.creneaux.find(c => c.matiere === 'Mathématiques'))
      .toEqual(expect.objectContaining({ heure_debut: '11:45', heure_fin: '12:15' }))
  })

  test('ne déplace jamais un rituel du matin pour une matière imposée', () => {
    const resultat = corrigerPrioriteMatin([
      creneau('lundi', '08:30', '08:45', 'Rituels du jour', 0),
      creneau('lundi', '14:00', '14:15', 'Vocabulaire', 1),
    ])

    expect(resultat).toEqual({
      ok: true,
      creneaux: expect.any(Array),
      modifie: false,
      deplacements: [],
    })
  })

  test('bloque clairement si la seule correction imposerait de découper une séance', () => {
    const entree = [
      creneau('lundi', '09:00', '09:30', 'Arts visuels', 0),
      creneau('lundi', '09:30', '10:00', 'Anglais', 1),
      creneau('lundi', '14:00', '15:00', 'Mathématiques', 2),
    ]

    const resultat = corrigerPrioriteMatin(entree)

    expect(resultat.ok).toBe(false)
    if (resultat.ok) return
    expect(resultat.creneaux).toBe(entree)
    expect(resultat.message).toMatch(/Mathématiques/)
    expect(resultat.message).toMatch(/60 min/)
    expect(resultat.message).toMatch(/matin/)
  })

  test('corrige la trame rechargée depuis les paramètres', () => {
    const resultat = corrigerPrioriteMatin(TRAME_EDT_CP)

    expect(resultat.ok).toBe(true)
    if (!resultat.ok) return
    expect(resultat.modifie).toBe(true)

    const imposeesApresMidi = resultat.creneaux.filter(c =>
      c.type === 'cours'
      && c.heure_debut >= '13:20'
      && matiereImposeeLeMatin(c.matiere) !== null)
    const autresMatin = resultat.creneaux.filter(c =>
      c.type === 'cours'
      && c.heure_fin <= '11:30'
      && matiereImposeeLeMatin(c.matiere) === null)

    expect(imposeesApresMidi.length === 0 || autresMatin.length === 0).toBe(true)
  })
})
