import { systemImport, systemChat, userImport, SYSTEM_BILAN, userBilan } from '../prompts'

describe('systemImport par matière', () => {
  test('français parle de sons/graphèmes', () => {
    const s = systemImport('francais')
    expect(s.toLowerCase()).toContain('graphème')
  })
  test('maths parle de notions et de répartition par semaine', () => {
    const s = systemImport('maths')
    expect(s.toLowerCase()).toContain('notion')
    expect(s.toLowerCase()).toContain('semaine')
  })
  test('consigne d’exhaustivité présente dans les deux', () => {
    expect(systemImport('francais').toLowerCase()).toContain('aucun')
    expect(systemImport('maths').toLowerCase()).toContain('aucun')
  })
})

describe('prompts', () => {
  test('userImport insère le texte du manuel', () => {
    const u = userImport('Semaine 1 : a — p.10')
    expect(u).toContain('Semaine 1 : a — p.10')
  })

  test('systemChat tutoie l’enseignant par son prénom', () => {
    expect(systemChat('Cécile')).toContain('Cécile')
  })

  test('systemChat sans prénom reste valide', () => {
    expect(systemChat(undefined)).toMatch(/assistant/i)
  })

  test('SYSTEM_BILAN impose le placeholder [ELEVE]', () => {
    expect(SYSTEM_BILAN).toContain('[ELEVE]')
  })

  test('userBilan liste les sons acquis et à retravailler', () => {
    const u = userBilan({ numeroSemaine: 3, sonsAcquis: ['a', 'i'], sonsNonAcquis: ['r'], statut: 'acquis' })
    expect(u).toContain('Semaine 3')
    expect(u).toContain('a, i')
    expect(u).toContain('r')
  })
})
