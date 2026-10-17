import { genererCahierJournal } from '../cahier-journal'
import type { CreneauHoraire, ProgressionMatiere } from '@/types'

const creneau = (
  ordre: number, matiere: string, type: 'cours' | 'routine' = 'cours',
): CreneauHoraire => ({
  id: `c-${ordre}`, class_id: 'classe', jour: 'lundi',
  heure_debut: '09:00', heure_fin: '09:30', matiere, ordre,
  couleur: null, type, methode_id: null, visible_journal: true,
})

const francais = (seances: ProgressionMatiere['seances']): ProgressionMatiere => ({
  methode_id: null, matiere: 'Français', items: [], pages: null,
  mots_exemple: null, seances,
})

describe('une séance par créneau', () => {
  it('pose chaque séance du jour dans un créneau différent, dans l’ordre', () => {
    const [lundi] = genererCahierJournal(
      [creneau(0, 'Français'), creneau(1, 'Français'), creneau(2, 'Français')],
      [francais([
        { jour: 1, domaine: 'LC', libelle: 'LC : La petite poule (séance 1)' },
        { jour: 1, domaine: '', libelle: 'Les prénoms (les lettres)' },
        { jour: 1, domaine: '', libelle: 'Geste d’écriture' },
      ])],
    )
    expect(lundi.seances.map(s => s.deroulement)).toEqual([
      'LC : La petite poule (séance 1)',
      'Les prénoms (les lettres)',
      'Geste d’écriture',
    ])
    expect(lundi.aPlacer ?? []).toEqual([])
  })

  it('n’empile jamais deux séances dans le même créneau', () => {
    const [lundi] = genererCahierJournal(
      [creneau(0, 'Français'), creneau(1, 'Français')],
      [francais([
        { jour: 1, domaine: '', libelle: 'Séance A' },
        { jour: 1, domaine: '', libelle: 'Séance B' },
        { jour: 1, domaine: '', libelle: 'Séance C' },
      ])],
    )
    expect(lundi.seances.map(s => s.deroulement)).toEqual(['Séance A', 'Séance B'])
    expect(lundi.aPlacer).toEqual([{ libelle: 'Séance C', origine: null }])
  })

  it('affiche la matière dans un créneau sans séance', () => {
    const [lundi] = genererCahierJournal(
      [creneau(0, 'Français'), creneau(1, 'Français')],
      [francais([{ jour: 1, domaine: '', libelle: 'Séance A' }])],
    )
    expect(lundi.seances.map(s => s.deroulement)).toEqual(['Séance A', 'Français'])
  })

  it('ne place rien d’un autre jour', () => {
    const [lundi] = genererCahierJournal(
      [creneau(0, 'Français')],
      [francais([
        { jour: 2, domaine: '', libelle: 'Séance de mardi' },
        { jour: 1, domaine: '', libelle: 'Séance de lundi' },
      ])],
    )
    expect(lundi.seances[0].deroulement).toBe('Séance de lundi')
  })

  it('laisse les progressions de notions exactement comme avant', () => {
    const notions: ProgressionMatiere = {
      methode_id: null, matiere: 'Maths',
      items: ['Nombres jusqu’à 10', 'Décomposer 4 et 5'],
      pages: 'p.12', mots_exemple: null,
      seances: [
        { jour: null, domaine: '', libelle: 'Nombres jusqu’à 10' },
        { jour: null, domaine: '', libelle: 'Décomposer 4 et 5' },
      ],
    }
    const [lundi] = genererCahierJournal(
      [creneau(0, 'Maths'), creneau(1, 'Maths')], [notions],
    )
    const attendu = 'Nombres jusqu’à 10, Décomposer 4 et 5 — p.12'
    expect(lundi.seances[0].deroulement).toBe(attendu)
    expect(lundi.seances[1].deroulement).toBe(attendu)
    expect(lundi.aPlacer ?? []).toEqual([])
  })

  it('ne perd pas une séance datée au-delà de la semaine', () => {
    const [lundi] = genererCahierJournal(
      [creneau(0, 'Français')],
      [francais([
        { jour: 1, domaine: '', libelle: 'Séance A' },
        { jour: 5, domaine: '', libelle: 'Séance hors semaine' },
      ])],
    )
    expect(lundi.aPlacer).toEqual([{ libelle: 'Séance hors semaine', origine: 'Jour 5' }])
  })

  it('montre une séance non datée une seule fois, le premier jour', () => {
    const edt = [creneau(0, 'Français'), { ...creneau(1, 'Français'), jour: 'mardi' as const }]
    const [lundi, mardi] = genererCahierJournal(edt, [francais([
      { jour: 1, domaine: '', libelle: 'Séance de lundi' },
      { jour: null, domaine: '', libelle: 'Consigne de la semaine' },
    ])])
    expect(lundi.aPlacer).toEqual([{ libelle: 'Consigne de la semaine', origine: 'semaine' }])
    expect(mardi.aPlacer ?? []).toEqual([])
  })

  it('ne touche pas aux routines', () => {
    const [lundi] = genererCahierJournal(
      [creneau(0, 'Récréation', 'routine'), creneau(1, 'Français')],
      [francais([{ jour: 1, domaine: '', libelle: 'Séance A' }])],
    )
    expect(lundi.seances[0].deroulement).toBe('')
    expect(lundi.seances[1].deroulement).toBe('Séance A')
  })
})
