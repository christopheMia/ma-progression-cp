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

  it('conserve la liste « à placer » d’un jour', () => {
    const contenu = [{
      jour: 'lundi',
      seances: [seanceA],
      aPlacer: [{ libelle: 'Séance C', origine: null }],
    }]
    expect(validerContenuJournal(contenu)[0].aPlacer).toEqual([{ libelle: 'Séance C', origine: null }])
  })

  it('accepte un jour sans « à placer »', () => {
    const contenu = [{ jour: 'lundi', seances: [seanceA] }]
    const resultat = validerContenuJournal(contenu)[0]
    expect(resultat.aPlacer).toBeUndefined()
    expect('aPlacer' in resultat).toBe(false)
  })

  it('garde l’origine texte et ordonne comme reçu', () => {
    const contenu = [{
      jour: 'mardi',
      seances: [],
      aPlacer: [
        { libelle: 'Séance D', origine: 'Jour 5' },
        { libelle: 'Séance E', origine: 'semaine' },
      ],
    }]
    expect(validerContenuJournal(contenu)[0].aPlacer).toEqual([
      { libelle: 'Séance D', origine: 'Jour 5' },
      { libelle: 'Séance E', origine: 'semaine' },
    ])
  })

  it('écarte les entrées mal formées sans rien inventer', () => {
    const contenu = [{
      jour: 'lundi',
      seances: [seanceA],
      aPlacer: [
        null,
        'texte',
        42,
        {},
        { libelle: '   ', origine: null },
        { libelle: 12, origine: null },
        { libelle: '  Séance F  ', origine: 7 },
      ],
    }]
    expect(validerContenuJournal(contenu)[0].aPlacer).toEqual([
      { libelle: 'Séance F', origine: null },
    ])
  })

  it('omet « à placer » quand rien de valide ne reste ou quand ce n’est pas une liste', () => {
    const vide = validerContenuJournal([{ jour: 'lundi', seances: [], aPlacer: [{ libelle: '' }] }])
    expect('aPlacer' in vide[0]).toBe(false)
    const pasUneListe = validerContenuJournal([{ jour: 'lundi', seances: [], aPlacer: 'oups' }])
    expect('aPlacer' in pasUneListe[0]).toBe(false)
  })

  it('survit à un aller-retour de sauvegarde puis de rechargement', () => {
    const contenu = [{
      jour: 'lundi',
      seances: [seanceA],
      aPlacer: [{ libelle: 'Séance C', origine: 'Jour 5' }],
    }]
    const unTour = validerContenuJournal(contenu)
    expect(validerContenuJournal(JSON.parse(JSON.stringify(unTour)))).toEqual(unTour)
  })

  it('l’édition ou la suppression d’une séance garde « à placer »', () => {
    const base = validerContenuJournal([{
      jour: 'lundi',
      seances: [seanceA],
      aPlacer: [{ libelle: 'Séance C', origine: null }],
    }])
    const modifie = modifierSeanceJournal(base, 0, 0, { ...base[0].seances[0], deroulement: 'Autre' })
    expect(modifie[0].aPlacer).toEqual([{ libelle: 'Séance C', origine: null }])
    const supprime = supprimerSeanceJournal(base, 0, 0)
    expect(supprime[0].aPlacer).toEqual([{ libelle: 'Séance C', origine: null }])
  })
})
