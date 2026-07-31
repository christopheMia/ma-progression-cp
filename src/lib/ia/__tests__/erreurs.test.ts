import { messageErreurIA, messageReponseIncomplete } from '../erreurs'

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

describe('messageReponseIncomplete', () => {
  test('réponse complète → rien à signaler', () => {
    expect(messageReponseIncomplete('end_turn')).toBeNull()
  })

  test('champ absent ou nul → rien à signaler', () => {
    expect(messageReponseIncomplete(null)).toBeNull()
    expect(messageReponseIncomplete(undefined)).toBeNull()
  })

  test('plafond de sortie atteint → dit que c’est coupé, et quoi faire', () => {
    const r = messageReponseIncomplete('max_tokens')
    expect(r).not.toBeNull()
    expect(r!.message).toMatch(/coupée/i)
    // Le message doit orienter vers un document plus court, pas vers un simple
    // « réessaie » : réessayer à l'identique redonnera le même résultat.
    expect(r!.message).toMatch(/plus court|page par page/i)
    expect(r!.status).toBe(422)
  })

  test('le conseil est adaptable à la route appelante', () => {
    const r = messageReponseIncomplete('max_tokens', 'Pose une question plus courte.')
    expect(r!.message).toMatch(/Pose une question plus courte/)
  })

  test('refus du modèle → message dédié, pas une erreur serveur', () => {
    const r = messageReponseIncomplete('refusal')
    expect(r).not.toBeNull()
    expect(r!.status).toBe(422)
  })
})
