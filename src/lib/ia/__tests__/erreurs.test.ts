import { messageErreurIA } from '../erreurs'

describe('messageErreurIA', () => {
  test('clé manquante → message de config', () => {
    const r = messageErreurIA(new Error('ANTHROPIC_API_KEY manquante : ...'))
    expect(r.message).toMatch(/configuré|configure/i)
  })

  test('crédit épuisé → message dédié (facturation)', () => {
    const r = messageErreurIA(new Error('Your credit balance is too low to access the Anthropic API'))
    expect(r.message).toMatch(/crédit IA est épuisé/i)
  })

  test('erreur générique → message neutre', () => {
    const r = messageErreurIA(new Error('socket hang up'))
    expect(r.message).toMatch(/réessaie|réessayez/i)
    expect(r.status).toBe(500)
  })
})
