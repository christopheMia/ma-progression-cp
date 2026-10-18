const mockCreate = jest.fn()
const mockEnregistrerUsageIA = jest.fn()
const mockUtilisateurCourant = jest.fn()
const mockCasesDeMaClasse = jest.fn()
const mockSoldeIA = jest.fn()

jest.mock('@/lib/ia/anthropic', () => ({
  getAnthropicClient: jest.fn(() => ({ messages: { create: mockCreate } })),
  MODELE_REGLE: 'modele-test',
}))
jest.mock('@/lib/actions/ia-usage', () => ({
  enregistrerUsageIA: mockEnregistrerUsageIA,
  soldeIA: mockSoldeIA,
}))
jest.mock('@/lib/supabase/session', () => ({ utilisateurCourant: mockUtilisateurCourant }))
jest.mock('@/lib/actions/regles-rangement', () => ({ casesDeMaClasse: mockCasesDeMaClasse }))

import { POST } from './route'

const requete = (corps: unknown) => new Request('http://localhost/api/ia-regle', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps),
})
function reponseIA(sortie: unknown, stop_reason = 'end_turn') {
  mockCreate.mockResolvedValue({
    content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(sortie) }],
    usage: { input_tokens: 300, output_tokens: 40 }, stop_reason,
  })
}

describe('POST /api/ia-regle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUtilisateurCourant.mockResolvedValue({ id: 'prof-1' })
    mockSoldeIA.mockResolvedValue({ consommeUsd: 0, restantUsd: null, releveAt: null, soldeReleveUsd: null })
    mockCasesDeMaClasse.mockResolvedValue({ ok: true, valeur: [{ nom: 'Musique', jours: ['jeudi'] }] })
  })

  it('sans connexion : refusé, sans appel IA', async () => {
    mockUtilisateurCourant.mockResolvedValue(null)
    expect((await POST(requete({ phrase: 'le chant en musique' }))).status).toBe(401)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('jauge IA vide : refusé, sans appel IA', async () => {
    mockSoldeIA.mockResolvedValue({ consommeUsd: 5, restantUsd: 0, releveAt: null, soldeReleveUsd: 5 })
    expect((await POST(requete({ phrase: 'le chant en musique' }))).status).toBe(402)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('phrase vide : un message pour elle', async () => {
    const r = await POST(requete({ phrase: ' ' }))
    expect(r.status).toBe(400)
    expect(await r.json()).toEqual({ error: 'Dis-moi en une phrase où tu fais cette séance.' })
  })

  it('emploi du temps vide : pas d’appel IA', async () => {
    mockCasesDeMaClasse.mockResolvedValue({ ok: true, valeur: [] })
    expect((await POST(requete({ phrase: 'le chant en musique' }))).status).toBe(422)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('rend la règle comprise, en lisant le bloc texte après la réflexion, et compte la dépense', async () => {
    reponseIA({ statut: 'regle', type: 'Chant', creneau: 'musique', jour: 'jeudi', plus_proche: '' })
    const r = await POST(requete({ phrase: 'le chant c’est le jeudi en musique' }))
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ reponse: { statut: 'regle', regle: { type: 'Chant', creneau: 'Musique', jour: 'jeudi' } } })
    expect(mockEnregistrerUsageIA).toHaveBeenCalledWith(expect.objectContaining({ route: 'ia-regle', modele: 'modele-test' }))
    const appel = mockCreate.mock.calls[0][0]
    expect(appel.model).toBe('modele-test')
    expect(appel.output_config.effort).toBe('low')
    expect(appel.output_config.format.type).toBe('json_schema')
  })

  it('réponse illisible : « incompris », jamais une erreur', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'pas du json' }], usage: {}, stop_reason: 'end_turn' })
    expect(await (await POST(requete({ phrase: 'bonjour' }))).json()).toEqual({ reponse: { statut: 'incompris' } })
  })

  it('réponse coupée : 422 avec un conseil, après avoir compté la dépense', async () => {
    reponseIA({}, 'max_tokens')
    expect((await POST(requete({ phrase: 'le chant en musique' }))).status).toBe(422)
    expect(mockEnregistrerUsageIA).toHaveBeenCalled()
  })

  it('type trop long ou pas du texte : 400, sans appel IA', async () => {
    const long = await POST(requete({ phrase: 'le chant en musique', type: 'x'.repeat(81) }))
    expect(long.status).toBe(400)
    expect((await long.json()).error).toMatch(/trop long/)
    const nombre = await POST(requete({ phrase: 'le chant en musique', type: 42 }))
    expect(nombre.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('refus du modèle : 422, dépense comptée', async () => {
    reponseIA({}, 'refusal')
    const r = await POST(requete({ phrase: 'le chant en musique' }))
    expect(r.status).toBe(422)
    expect(mockEnregistrerUsageIA).toHaveBeenCalled()
  })

  it('appel IA qui échoue : message traduit, aucune dépense comptée', async () => {
    mockCreate.mockRejectedValue(new Error('credit balance is too low'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const r = await POST(requete({ phrase: 'le chant en musique' }))
    spy.mockRestore()
    expect(r.status).toBe(402)
    expect(mockEnregistrerUsageIA).not.toHaveBeenCalled()
  })

  it('emploi du temps illisible : 500 avec son message, sans appel IA', async () => {
    mockCasesDeMaClasse.mockResolvedValue({ ok: false, message: 'Ton emploi du temps n’a pas pu être lu.' })
    const r = await POST(requete({ phrase: 'le chant en musique' }))
    expect(r.status).toBe(500)
    expect(await r.json()).toEqual({ error: 'Ton emploi du temps n’a pas pu être lu.' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('case introuvable : la réponse le dit, avec la case la plus proche', async () => {
    reponseIA({ statut: 'introuvable', type: 'Fluence', creneau: 'Soutien', jour: 'jeudi', plus_proche: 'Musique' })
    const r = await POST(requete({ phrase: 'la fluence en soutien le jeudi' }))
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ reponse: {
      statut: 'introuvable', type: 'Fluence', demande: 'Soutien le jeudi', plusProche: { creneau: 'Musique', jour: 'jeudi' },
    } })
  })

  it('un champ « cases » envoyé par le navigateur est ignoré : les cases viennent de la base', async () => {
    reponseIA({ statut: 'regle', type: 'Chant', creneau: 'Ateliers', jour: '', plus_proche: '' })
    const r = await POST(requete({ phrase: 'le chant en ateliers', cases: [{ nom: 'Ateliers', jours: ['lundi'] }] }))
    expect((await r.json()).reponse.statut).toBe('introuvable')
    const consigne = mockCreate.mock.calls[0][0].messages[0].content as string
    expect(consigne).toContain('jeudi : Musique')
    expect(consigne).not.toContain('lundi :')
  })

  it('le type reçu va dans la consigne et l’emporte sur celui du modèle', async () => {
    reponseIA({ statut: 'regle', type: 'Chants', creneau: 'Musique', jour: 'jeudi', plus_proche: '' })
    const r = await POST(requete({ phrase: 'en musique le jeudi', type: 'Chant' }))
    expect((await r.json()).reponse.regle.type).toBe('Chant')
    expect(mockCreate.mock.calls[0][0].messages[0].content).toContain('Type concerné : Chant')
  })
})
