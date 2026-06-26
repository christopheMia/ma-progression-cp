import { genererCahierJournal } from '../cahier-journal'
import type { CreneauHoraire } from '@/types'

const creneau = (over: Partial<CreneauHoraire>): CreneauHoraire => ({
  id: 'x', class_id: 'c', jour: 'lundi', heure_debut: '08:45', heure_fin: '09:15',
  matiere: 'Lecture', ordre: 0, couleur: null, type: 'cours',
  methode_id: null, visible_journal: true, ...over,
})

describe('genererCahierJournal (lien par méthode)', () => {
  const progression = [
    { methode_id: 'm-fr', matiere: 'francais', items: ['a'], pages: 'p.10-13', mots_exemple: ['ami', 'papa'] },
    { methode_id: 'm-ma', matiere: 'maths', items: ['Nombres jusqu’à 10'], pages: 'p.8', mots_exemple: [] },
  ]

  test('une fiche par jour, dans l’ordre', () => {
    const edt = [creneau({ jour: 'lundi' }), creneau({ jour: 'jeudi' })]
    expect(genererCahierJournal(edt, progression).map(j => j.jour)).toEqual(['lundi', 'jeudi'])
  })

  test('les lignes routine ne sont pas remplissables', () => {
    const edt = [creneau({ matiere: 'Récréation', type: 'routine' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.type).toBe('routine')
    expect(s.deroulement).toBe('')
  })

  test('un créneau relié à la méthode française est pré-rempli', () => {
    const edt = [creneau({ matiere: 'Lecture', methode_id: 'm-fr' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.deroulement).toContain('a')
    expect(s.deroulement).toContain('p.10-13')
  })

  test('un créneau relié à la méthode maths est pré-rempli', () => {
    const edt = [creneau({ matiere: 'Maths', methode_id: 'm-ma' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.deroulement).toContain('Nombres jusqu’à 10')
  })

  test('un créneau sans méthode a un déroulement vide', () => {
    const edt = [creneau({ matiere: 'Arts visuels', methode_id: null })]
    expect(genererCahierJournal(edt, progression)[0].seances[0].deroulement).toBe('')
  })

  test('un créneau masqué (visible_journal=false) n’apparaît pas', () => {
    const edt = [
      creneau({ matiere: 'Lecture', methode_id: 'm-fr' }),
      creneau({ matiere: 'Anglais', visible_journal: false, ordre: 1 }),
    ]
    const seances = genererCahierJournal(edt, progression)[0].seances
    expect(seances).toHaveLength(1)
    expect(seances[0].matiere).toBe('Lecture')
  })
})
