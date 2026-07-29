/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'
import { createServerClient } from '@supabase/ssr'

const getUser = jest.fn()

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: (...a: unknown[]) => getUser(...a) } })),
}))

function requete(url: string, entetes: Record<string, string> = {}) {
  return new NextRequest(new URL(url, 'https://exemple.fr'), { headers: entetes })
}

describe('proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  })

  test('renvoie vers la connexion qui n’est pas connecté', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const r = await proxy(requete('/livret'))
    expect(r.status).toBe(307)
    expect(r.headers.get('location')).toContain('/connexion')
  })

  test('laisse passer qui est connecté', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const r = await proxy(requete('/livret'))
    expect(r.headers.get('location')).toBeNull()
  })

  test('renvoie vers l’accueil qui est déjà connecté et demande la connexion', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const r = await proxy(requete('/connexion'))
    expect(r.headers.get('location')).toContain('/accueil')
  })

  // `getUser` appelle le serveur d'authentification par le reseau. Un
  // prechargement ne doit pas le payer : le menu et les cartes de l'accueil en
  // declenchent une dizaine pendant qu'on lit la page.
  test('ne vérifie pas l’identité sur un préchargement', async () => {
    const r = await proxy(requete('/livret', { 'next-router-prefetch': '1' }))
    expect(getUser).not.toHaveBeenCalled()
    expect(createServerClient).not.toHaveBeenCalled()
    expect(r.headers.get('location')).toBeNull()
  })

  // La securite ne repose pas sur le proxy seul : le layout verifie l'identite
  // au rendu, donc un prechargement non connecte ne rend rien d'utile.
  test('une vraie navigation reste vérifiée même après un préchargement', async () => {
    await proxy(requete('/livret', { 'next-router-prefetch': '1' }))
    getUser.mockResolvedValue({ data: { user: null } })
    const r = await proxy(requete('/livret'))
    expect(r.headers.get('location')).toContain('/connexion')
  })
})
