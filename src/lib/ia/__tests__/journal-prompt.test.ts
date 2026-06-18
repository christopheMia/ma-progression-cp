import { userJournal } from '../prompts'

describe('userJournal', () => {
  test('liste les créneaux cours et le contenu de la semaine', () => {
    const txt = userJournal({
      numeroSemaine: 3,
      creneaux: [{ heure_debut: '08:45', heure_fin: '09:15', matiere: 'Appropriation des graphèmes' }],
      francais: ['a'],
      maths: ['Nombres jusqu\'à 10'],
    })
    expect(txt).toContain('Appropriation des graphèmes')
    expect(txt).toContain('a')
    expect(txt).toContain('Nombres jusqu\'à 10')
  })
})
