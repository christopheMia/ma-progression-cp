import { TRAME_EDT_CP, couleurMatiere, COULEURS_FAMILLE } from '../trame-edt'

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

  test('couleurMatiere range chaque matière dans sa famille', () => {
    expect(couleurMatiere('Mathématiques')).toBe(COULEURS_FAMILLE.maths)
    expect(couleurMatiere('EPS')).toBe(COULEURS_FAMILLE.eps)
    // Auparavant sans couleur : l'histoire-géo, les sciences et l'EMC
    // s'affichaient en blanc. Elles ont maintenant leur famille.
    expect(couleurMatiere('Histoire géographie')).toBe(COULEURS_FAMILLE.qlm)
    expect(couleurMatiere('Sciences et technologie')).toBe(COULEURS_FAMILLE.qlm)
    expect(couleurMatiere('EMC')).toBe(COULEURS_FAMILLE.emc)
  })

  test('le créneau Mathématiques 10h30-11h30 existe pour lundi', () => {
    const m = TRAME_EDT_CP.find(c =>
      c.jour === 'lundi' && c.heure_debut === '10:30' && c.matiere === 'Mathématiques')
    expect(m).toBeTruthy()
    expect(m?.couleur).toBe('#fbcfe8')
  })

  test('18 tranches × 4 jours = 72 créneaux', () => {
    expect(TRAME_EDT_CP).toHaveLength(72)
  })
})
