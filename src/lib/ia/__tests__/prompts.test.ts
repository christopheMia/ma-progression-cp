import { SYSTEM_IMPORT, systemChat, userImport, SYSTEM_BILAN, userBilan } from '../prompts'

describe('prompts', () => {
  test('SYSTEM_IMPORT impose 1 son par graphème et le format', () => {
    expect(SYSTEM_IMPORT).toMatch(/graphème/i)
    expect(SYSTEM_IMPORT).toMatch(/semaine/i)
  })

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
