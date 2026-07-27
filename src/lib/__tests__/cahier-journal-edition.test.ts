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
