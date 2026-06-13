import { genererCahierJournal } from '@/lib/cahier-journal'
import { Semaine, CreneauHoraire } from '@/types'

const semaine: Semaine = {
  id: 'sem-1',
  class_id: 'cls-1',
  numero: 1,
  date_debut: '2025-09-01',
  graphemes: ['a'],
  edm_theme: 'Moi et les autres',
  edm_competences: 'Se repérer dans le temps scolaire',
  manuel_pages: 'pp. 10-12',
  mots_exemple: ['ami', 'papa'],
  note: null,
}

const emploiDuTemps: CreneauHoraire[] = [
  { id: 'c1', class_id: 'cls-1', jour: 'lundi', heure_debut: '09:00', heure_fin: '09:45', matiere: 'Lecture', ordre: 0 },
  { id: 'c2', class_id: 'cls-1', jour: 'lundi', heure_debut: '10:00', heure_fin: '10:45', matiere: 'Mathématiques', ordre: 1 },
  { id: 'c3', class_id: 'cls-1', jour: 'mardi', heure_debut: '09:00', heure_fin: '09:45', matiere: 'Explorer le monde', ordre: 0 },
]

describe('genererCahierJournal', () => {
  it('generates one entry per day that has timetable slots', () => {
    const result = genererCahierJournal(semaine, emploiDuTemps)
    const jours = result.map(j => j.jour)
    expect(jours).toContain('lundi')
    expect(jours).toContain('mardi')
    expect(jours).not.toContain('mercredi')
  })

  it('pre-fills Lecture séance with grapheme and pages', () => {
    const result = genererCahierJournal(semaine, emploiDuTemps)
    const lundi = result.find(j => j.jour === 'lundi')!
    const lecture = lundi.seances.find(s => s.matiere === 'Lecture')!
    expect(lecture.objectif).toContain('a')
    expect(lecture.activite).toContain('pp. 10-12')
  })

  it('pre-fills EDM séance with theme', () => {
    const result = genererCahierJournal(semaine, emploiDuTemps)
    const mardi = result.find(j => j.jour === 'mardi')!
    const edm = mardi.seances.find(s => s.matiere === 'Explorer le monde')!
    expect(edm.objectif).toContain('Moi et les autres')
  })

  it('leaves other matières with empty strings', () => {
    const result = genererCahierJournal(semaine, emploiDuTemps)
    const lundi = result.find(j => j.jour === 'lundi')!
    const maths = lundi.seances.find(s => s.matiere === 'Mathématiques')!
    expect(maths.objectif).toBe('')
    expect(maths.activite).toBe('')
  })
})
