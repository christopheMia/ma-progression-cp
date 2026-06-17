import { TRAME_EDT_CP, couleurMatiere } from '../trame-edt'

describe('TRAME_EDT_CP', () => {
  test('contient des créneaux pour les 4 jours (pas de mercredi)', () => {
    const jours = new Set(TRAME_EDT_CP.map(c => c.jour))
    expect([...jours].sort()).toEqual(['jeudi', 'lundi', 'mardi', 'vendredi'])
  })

  test('chaque créneau a un type cours ou routine', () => {
    expect(TRAME_EDT_CP.every(c => c.type === 'cours' || c.type === 'routine')).toBe(true)
  })

  test('les lignes Accueil / Récréation / Pause sont des routines', () => {
    const accueil = TRAME_EDT_CP.find(c => c.matiere.startsWith('Accueil'))
    expect(accueil?.type).toBe('routine')
  })

  test('couleurMatiere range les maths en rose et l\'EPS en jaune', () => {
    expect(couleurMatiere('Mathématiques')).toBe('#fbcfe8')
    expect(couleurMatiere('EPS')).toBe('#fef08a')
    expect(couleurMatiere('Histoire géographie')).toBeNull()
  })

  test('le créneau Mathématiques 10h30-11h30 existe pour lundi', () => {
    const m = TRAME_EDT_CP.find(c =>
      c.jour === 'lundi' && c.heure_debut === '10:30' && c.matiere === 'Mathématiques')
    expect(m).toBeTruthy()
    expect(m?.couleur).toBe('#fbcfe8')
  })
})
