import { genererCahierJournal } from '../cahier-journal'
import type { CreneauHoraire } from '@/types'

const creneau = (over: Partial<CreneauHoraire>): CreneauHoraire => ({
  id: 'x', class_id: 'c', jour: 'lundi', heure_debut: '08:45', heure_fin: '09:15',
  matiere: 'Appropriation des graphèmes', ordre: 0, couleur: null, type: 'cours', ...over,
})

describe('genererCahierJournal (3 colonnes)', () => {
  const progression = [
    { matiere: 'francais', items: ['a'], pages: 'p.10-13', mots_exemple: ['ami', 'papa'] },
    { matiere: 'maths', items: ['Nombres jusqu’à 10'], pages: 'p.8', mots_exemple: [] },
  ]

  test('une fiche par jour, dans l’ordre', () => {
    const edt = [creneau({ jour: 'lundi' }), creneau({ jour: 'jeudi' })]
    const jours = genererCahierJournal(edt, progression)
    expect(jours.map(j => j.jour)).toEqual(['lundi', 'jeudi'])
  })

  test('les lignes routine ne sont pas remplissables (deroulement vide, flag routine)', () => {
    const edt = [creneau({ matiere: 'Récréation', type: 'routine' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.type).toBe('routine')
    expect(s.deroulement).toBe('')
  })

  test('le creneau graphemes est pre-rempli depuis la progression francais', () => {
    const edt = [creneau({ matiere: 'Appropriation des graphèmes' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.deroulement).toContain('a')
    expect(s.deroulement).toContain('p.10-13')
  })

  test('le creneau maths est pre-rempli depuis la progression maths', () => {
    const edt = [creneau({ matiere: 'Mathématiques', heure_debut: '10:30', heure_fin: '11:30' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.deroulement).toContain('Nombres jusqu’à 10')
  })

  test('les autres matieres ont un deroulement vide a remplir', () => {
    const edt = [creneau({ matiere: 'Arts visuels' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.deroulement).toBe('')
  })
})
