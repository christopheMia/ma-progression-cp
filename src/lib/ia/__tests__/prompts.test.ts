import { SYSTEM_IMPORT, systemChat, userImport } from '../prompts'

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
})
