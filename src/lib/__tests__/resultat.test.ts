import { resultat } from '@/lib/resultat'

describe('resultat', () => {
  it('rend la valeur quand le travail aboutit', async () => {
    const r = await resultat(async () => 'ok')
    expect(r).toEqual({ ok: true, valeur: 'ok' })
  })

  it('rend le message de l’erreur au lieu de la laisser remonter', async () => {
    const r = await resultat(async () => {
      throw new Error('Écris le critère que tu veux observer.')
    })
    expect(r).toEqual({ ok: false, message: 'Écris le critère que tu veux observer.' })
  })

  it('ne laisse jamais l’erreur traverser la frontiere serveur', async () => {
    await expect(
      resultat(async () => {
        throw new Error('boum')
      }),
    ).resolves.toEqual({ ok: false, message: 'boum' })
  })

  it('retombe sur le message par defaut si l’erreur n’en porte pas', async () => {
    const r = await resultat(async () => {
      throw new Error('')
    }, 'Le critère n’a pas pu être ajouté.')
    expect(r).toEqual({ ok: false, message: 'Le critère n’a pas pu être ajouté.' })
  })

  it('retombe sur le message par defaut si ce qui est leve n’est pas une erreur', async () => {
    const r = await resultat(async () => {
      throw 'texte nu'
    }, 'Le critère n’a pas pu être ajouté.')
    expect(r).toEqual({ ok: false, message: 'Le critère n’a pas pu être ajouté.' })
  })
})
