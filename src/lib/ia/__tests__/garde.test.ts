const mockUtilisateurCourant = jest.fn()

jest.mock('@/lib/supabase/session', () => ({
  utilisateurCourant: mockUtilisateurCourant,
}))

import { refuserSiDeconnecte } from '../garde'

describe('refuserSiDeconnecte', () => {
  beforeEach(() => {
    mockUtilisateurCourant.mockReset()
  })

  test('renvoie 401 quand personne n est connecte', async () => {
    mockUtilisateurCourant.mockResolvedValue(null)

    const refus = await refuserSiDeconnecte()

    expect(refus).not.toBeNull()
    expect(refus!.status).toBe(401)
    expect(await refus!.json()).toEqual({ error: 'Connexion requise.' })
  })

  test('laisse passer un utilisateur connecte', async () => {
    mockUtilisateurCourant.mockResolvedValue({ id: 'prof-1' })

    expect(await refuserSiDeconnecte()).toBeNull()
  })
})
