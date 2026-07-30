const mockUtilisateurCourant = jest.fn()
const mockSoldeIA = jest.fn()

jest.mock('@/lib/supabase/session', () => ({
  utilisateurCourant: mockUtilisateurCourant,
}))

jest.mock('@/lib/actions/ia-usage', () => ({
  soldeIA: mockSoldeIA,
}))

import { garderAppelIA } from '../garde'

const AUCUN_RELEVE = { consommeUsd: 0, restantUsd: null, releveAt: null, soldeReleveUsd: null }

describe('garderAppelIA', () => {
  beforeEach(() => {
    mockUtilisateurCourant.mockReset()
    mockSoldeIA.mockReset()
    mockUtilisateurCourant.mockResolvedValue({ id: 'prof-1' })
    mockSoldeIA.mockResolvedValue(AUCUN_RELEVE)
  })

  test('renvoie 401 quand personne n est connecte', async () => {
    mockUtilisateurCourant.mockResolvedValue(null)

    const refus = await garderAppelIA()

    expect(refus).not.toBeNull()
    expect(refus!.status).toBe(401)
    expect(await refus!.json()).toEqual({ error: 'Connexion requise.' })
  })

  test('ne consulte meme pas le solde si l utilisateur n est pas connecte', async () => {
    mockUtilisateurCourant.mockResolvedValue(null)

    await garderAppelIA()

    expect(mockSoldeIA).not.toHaveBeenCalled()
  })

  test('laisse passer un utilisateur connecte au credit positif', async () => {
    mockSoldeIA.mockResolvedValue({ ...AUCUN_RELEVE, restantUsd: 1.66, soldeReleveUsd: 5 })

    expect(await garderAppelIA()).toBeNull()
  })

  test('renvoie 402 quand le credit estime est epuise', async () => {
    mockSoldeIA.mockResolvedValue({ ...AUCUN_RELEVE, restantUsd: 0, soldeReleveUsd: 5 })

    const refus = await garderAppelIA()

    expect(refus).not.toBeNull()
    expect(refus!.status).toBe(402)
    expect((await refus!.json()).error).toMatch(/crédit ia est épuisé/i)
  })

  test('renvoie 402 quand le credit estime est negatif', async () => {
    mockSoldeIA.mockResolvedValue({ ...AUCUN_RELEVE, restantUsd: -0.42, soldeReleveUsd: 5 })

    expect((await garderAppelIA())!.status).toBe(402)
  })

  test('ne bloque pas tant qu aucun releve de solde n a ete saisi', async () => {
    // On sait l estimation incomplete tant qu elle n est ancree sur rien :
    // refuser un import sur ce chiffre-la serait pire que de laisser passer.
    mockSoldeIA.mockResolvedValue({ ...AUCUN_RELEVE, consommeUsd: 42 })

    expect(await garderAppelIA()).toBeNull()
  })
})
