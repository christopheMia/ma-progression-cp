const mockCreate = jest.fn()
const mockEnregistrerUsageIA = jest.fn()
const mockUtilisateurCourant = jest.fn()

jest.mock('@/lib/ia/anthropic', () => ({
  getAnthropicClient: jest.fn(() => ({ messages: { create: mockCreate } })),
  MODELE_IMPORT: 'modele-test',
}))

jest.mock('@/lib/actions/ia-usage', () => ({
  enregistrerUsageIA: mockEnregistrerUsageIA,
  soldeIA: jest.fn(async () => ({
    consommeUsd: 0, restantUsd: null, releveAt: null, soldeReleveUsd: null,
  })),
}))

jest.mock('@/lib/supabase/session', () => ({
  utilisateurCourant: mockUtilisateurCourant,
}))

import { POST } from './route'

const GRILLE = [
  { jour: 'lundi', heure_debut: '08:20', heure_fin: '08:30', matiere: 'Accueil', type: 'routine' },
  { jour: 'lundi', heure_debut: '08:30', heure_fin: '09:15', matiere: 'Chut je lis', type: 'cours' },
]

function reponseIA(creneaux: unknown[] = GRILLE) {
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ creneaux }) }],
    usage: { input_tokens: 12, output_tokens: 34 },
  })
}

function requete(form: FormData) {
  return new Request('http://localhost/api/ia-edt', { method: 'POST', body: form })
}

function formTexte(texte: string) {
  const form = new FormData()
  form.append('texte', texte)
  return form
}

const TEXTE_EDT = 'lundi\tmardi\n08:20 Accueil\t08:20 Accueil\n08:30 Chut je lis\t08:30 Calcul'

/** Le dernier appel a l IA, decompose en ce qui compte pour les assertions. */
function dernierAppel() {
  const appel = mockCreate.mock.calls.at(-1)?.[0]
  const blocs = appel.messages[0].content as Array<Record<string, unknown>>
  return {
    system: appel.system as string,
    types: blocs.map(bloc => bloc.type),
    textes: blocs.filter(bloc => bloc.type === 'text').map(bloc => bloc.text as string),
  }
}

describe('POST /api/ia-edt', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockEnregistrerUsageIA.mockReset()
    mockUtilisateurCourant.mockReset()
    mockUtilisateurCourant.mockResolvedValue({ id: 'prof-1' })
  })

  test('refuse un appel sans utilisateur connecte, sans toucher a l IA', async () => {
    mockUtilisateurCourant.mockResolvedValue(null)

    const reponse = await POST(requete(formTexte(TEXTE_EDT)))

    expect(reponse.status).toBe(401)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('refuse une requete sans PDF ni texte exploitable', async () => {
    const reponse = await POST(requete(formTexte('trop court')))

    expect(reponse.status).toBe(400)
    expect(await reponse.json()).toEqual({ error: 'Aucun emploi du temps reçu.' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('lit un emploi du temps fourni en texte, sans bloc document', async () => {
    reponseIA()

    const reponse = await POST(requete(formTexte(TEXTE_EDT)))

    expect(reponse.status).toBe(200)
    expect((await reponse.json()).creneaux).toHaveLength(2)
    const { types, textes } = dernierAppel()
    expect(types).not.toContain('document')
    // FormData normalise les sauts de ligne en CRLF : on compare les lignes.
    expect(textes[0].split(/\r?\n/)).toEqual(TEXTE_EDT.split('\n'))
  })

  test('adapte la consigne : pas de « PDF » quand le document arrive en texte', async () => {
    reponseIA()

    await POST(requete(formTexte(TEXTE_EDT)))

    const { system, textes } = dernierAppel()
    expect(system).toMatch(/TEXTE extrait d'un document Word ou Excel/)
    expect(system).not.toMatch(/fourni en PDF/)
    expect(textes.at(-1)).toMatch(/ci-dessous/)
  })

  test('envoie un PDF en bloc document et garde la consigne PDF', async () => {
    reponseIA()
    const form = new FormData()
    form.append('pdf', new File(['%PDF-1.7'], 'edt.pdf', { type: 'application/pdf' }))

    const reponse = await POST(requete(form))

    expect(reponse.status).toBe(200)
    const { system, types, textes } = dernierAppel()
    expect(types).toContain('document')
    expect(system).toMatch(/fourni en PDF/)
    expect(textes.at(-1)).toMatch(/joint/)
  })

  test('rend une erreur parlante quand l IA ne reconnait aucun creneau', async () => {
    reponseIA([])

    const reponse = await POST(requete(formTexte(TEXTE_EDT)))

    expect(reponse.status).toBe(422)
    expect((await reponse.json()).error).toMatch(/aucun créneau dans ce document/i)
  })
})
