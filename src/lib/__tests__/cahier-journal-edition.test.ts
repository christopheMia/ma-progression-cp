import {
  modifierSeanceJournal,
  supprimerSeanceJournal,
  validerContenuJournal,
} from '../cahier-journal-edition'
import { heureSansSecondes } from '../horaires'
import type { JourJournal } from '@/types'

const journal: JourJournal[] = [
  {
    jour: 'lundi',
    seances: [
      {
        matiere: 'Lecture',
        heure_debut: '08:45',
        heure_fin: '09:15',
        type: 'cours',
        deroulement: 'Son a',
      },
      {
        matiere: 'Mathématiques',
        heure_debut: '09:15',
        heure_fin: '10:00',
        type: 'cours',
        deroulement: 'Nombres jusqu’à 10',
      },
    ],
  },
  {
    jour: 'mardi',
    seances: [
      {
        matiere: 'Accueil',
        heure_debut: '08:30',
        heure_fin: '08:45',
        type: 'routine',
        deroulement: '',
      },
    ],
  },
]

describe('édition ciblée du cahier journal', () => {
  test('retire les secondes des horaires affichés et exportés', () => {
    expect(heureSansSecondes('08:45:00')).toBe('08:45')
    expect(heureSansSecondes('14:30')).toBe('14:30')
  })

  test('modifie une seule séance sans muter ni perdre les autres contenus', () => {
    const resultat = modifierSeanceJournal(journal, 0, 1, {
      ...journal[0].seances[1],
      matiere: 'Calcul mental',
      deroulement: 'Jeu des compléments à 10',
    })

    expect(resultat[0].seances[1]).toMatchObject({
      matiere: 'Calcul mental',
      deroulement: 'Jeu des compléments à 10',
    })
    expect(resultat[0].seances[0]).toEqual(journal[0].seances[0])
    expect(resultat[1]).toEqual(journal[1])
    expect(journal[0].seances[1].matiere).toBe('Mathématiques')
  })

  test('supprime une seule séance et conserve toutes les autres', () => {
    const resultat = supprimerSeanceJournal(journal, 0, 0)

    expect(resultat[0].seances).toEqual([journal[0].seances[1]])
    expect(resultat[1]).toEqual(journal[1])
    expect(journal[0].seances).toHaveLength(2)
  })

  test('conserve le jour vide quand sa dernière séance est supprimée', () => {
    const resultat = supprimerSeanceJournal(journal, 1, 0)

    expect(resultat).toHaveLength(2)
    expect(resultat[1]).toEqual({ jour: 'mardi', seances: [] })
  })

  test('valide les heures Supabase avec secondes et nettoie les textes', () => {
    const resultat = validerContenuJournal([
      {
        jour: 'lundi',
        seances: [{
          matiere: '  Lecture  ',
          heure_debut: '08:45:00',
          heure_fin: '09:15:00',
          type: 'cours',
          deroulement: '  Son a  ',
        }],
      },
    ])

    expect(resultat[0].seances[0]).toEqual({
      matiere: 'Lecture',
      heure_debut: '08:45:00',
      heure_fin: '09:15:00',
      type: 'cours',
      deroulement: 'Son a',
    })
  })

  test('refuse une matière vide et un horaire incohérent', () => {
    expect(() => validerContenuJournal([
      {
        jour: 'lundi',
        seances: [{
          matiere: ' ',
          heure_debut: '09:15',
          heure_fin: '08:45',
          type: 'cours',
          deroulement: '',
        }],
      },
    ])).toThrow(/matière/i)

    expect(() => modifierSeanceJournal(journal, 0, 0, {
      ...journal[0].seances[0],
      heure_debut: '10:00',
      heure_fin: '09:00',
    })).toThrow(/heure de fin/i)
  })
})

describe('validerContenuJournal : liste « à placer »', () => {
  const seanceA = {
    matiere: 'Français',
    heure_debut: '09:00',
    heure_fin: '09:30',
    type: 'cours',
    deroulement: 'Séance A',
  }
  const jourAvec = (aPlacer: unknown, jour = 'lundi') => ({ jour, seances: [seanceA], aPlacer })

  test('conserve la liste « à placer » d’un jour', () => {
    const contenu = [jourAvec([{ libelle: 'Séance C', origine: null }])]
    expect(validerContenuJournal(contenu)[0].aPlacer).toEqual([{ libelle: 'Séance C', origine: null }])
  })

  test('accepte un jour sans « à placer » et n’ajoute pas la clé', () => {
    const resultat = validerContenuJournal([{ jour: 'lundi', seances: [seanceA] }])[0]
    expect('aPlacer' in resultat).toBe(false)
  })

  test('garde l’origine texte et l’ordre reçu', () => {
    const contenu = [jourAvec([
      { libelle: 'Séance D', origine: 'Jour 5' },
      { libelle: 'Séance E', origine: 'semaine' },
    ], 'mardi')]
    expect(validerContenuJournal(contenu)[0].aPlacer).toEqual([
      { libelle: 'Séance D', origine: 'Jour 5' },
      { libelle: 'Séance E', origine: 'semaine' },
    ])
  })

  test('une origine vide, blanche ou non textuelle devient null, sinon elle est rognée', () => {
    const resultat = validerContenuJournal([jourAvec([
      { libelle: 'A', origine: '' },
      { libelle: 'B', origine: '   ' },
      { libelle: 'C', origine: 7 },
      { libelle: 'D' },
      { libelle: 'E', origine: '  Jour 5  ' },
    ])])
    expect(resultat[0].aPlacer).toEqual([
      { libelle: 'A', origine: null },
      { libelle: 'B', origine: null },
      { libelle: 'C', origine: null },
      { libelle: 'D', origine: null },
      { libelle: 'E', origine: 'Jour 5' },
    ])
  })

  test('garde deux entrées identiques, dans l’ordre (le retrait se fera par rang)', () => {
    const doublon = { libelle: 'Séance C', origine: 'semaine' }
    const resultat = validerContenuJournal([jourAvec([doublon, { libelle: 'Séance D', origine: null }, doublon])])
    expect(resultat[0].aPlacer).toEqual([
      doublon,
      { libelle: 'Séance D', origine: null },
      doublon,
    ])
  })

  test('conserve « à placer » sur plusieurs jours, chacun le sien', () => {
    const resultat = validerContenuJournal([
      jourAvec([{ libelle: 'Lundi 1', origine: null }], 'lundi'),
      { jour: 'mardi', seances: [seanceA] },
      jourAvec([{ libelle: 'Jeudi 1', origine: 'Jour 5' }, { libelle: 'Jeudi 2', origine: null }], 'jeudi'),
    ])
    expect(resultat[0].aPlacer).toEqual([{ libelle: 'Lundi 1', origine: null }])
    expect('aPlacer' in resultat[1]).toBe(false)
    expect(resultat[2].aPlacer).toHaveLength(2)
  })

  test('écarte en silence les entrées mal formées sans rien inventer', () => {
    const contenu = [jourAvec([
      null,
      'texte',
      42,
      {},
      { libelle: '   ', origine: null },
      { libelle: 12, origine: null },
      { libelle: '  Séance F  ', origine: 7 },
    ])]
    expect(validerContenuJournal(contenu)[0].aPlacer).toEqual([
      { libelle: 'Séance F', origine: null },
    ])
  })

  test('omet « à placer » quand rien de valide ne reste ou quand ce n’est pas une liste', () => {
    const vide = validerContenuJournal([jourAvec([{ libelle: '' }])])
    expect('aPlacer' in vide[0]).toBe(false)
    const pasUneListe = validerContenuJournal([jourAvec('oups')])
    expect('aPlacer' in pasUneListe[0]).toBe(false)
  })

  test('refuse trop d’entrées, un libellé trop long ou une origine trop longue', () => {
    const trop = Array.from({ length: 201 }, (_, i) => ({ libelle: `S${i}`, origine: null }))
    expect(() => validerContenuJournal([jourAvec(trop)])).toThrow(/à placer/i)

    const limite = Array.from({ length: 200 }, (_, i) => ({ libelle: `S${i}`, origine: null }))
    expect(validerContenuJournal([jourAvec(limite)])[0].aPlacer).toHaveLength(200)

    expect(() => validerContenuJournal([jourAvec([{ libelle: 'x'.repeat(20_001), origine: null }])]))
      .toThrow(/libellé/i)
    expect(validerContenuJournal([jourAvec([{ libelle: 'x'.repeat(20_000), origine: null }])])[0].aPlacer)
      .toHaveLength(1)

    expect(() => validerContenuJournal([jourAvec([{ libelle: 'A', origine: 'x'.repeat(201) }])]))
      .toThrow(/origine/i)
    expect(validerContenuJournal([jourAvec([{ libelle: 'A', origine: 'x'.repeat(200) }])])[0].aPlacer)
      .toHaveLength(1)
  })

  test('survit à un aller-retour de sauvegarde puis de rechargement', () => {
    const unTour = validerContenuJournal([jourAvec([{ libelle: 'Séance C', origine: 'Jour 5' }])])
    expect(validerContenuJournal(JSON.parse(JSON.stringify(unTour)))).toEqual(unTour)
  })

  test('l’édition ou la suppression d’une séance garde « à placer »', () => {
    const base = validerContenuJournal([jourAvec([{ libelle: 'Séance C', origine: null }])])
    const modifie = modifierSeanceJournal(base, 0, 0, { ...base[0].seances[0], deroulement: 'Autre' })
    expect(modifie[0].aPlacer).toEqual([{ libelle: 'Séance C', origine: null }])
    const supprime = supprimerSeanceJournal(base, 0, 0)
    expect(supprime[0].aPlacer).toEqual([{ libelle: 'Séance C', origine: null }])
  })
})
