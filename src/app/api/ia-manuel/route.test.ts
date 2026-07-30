const mockCreate = jest.fn()
const mockEnregistrerUsageIA = jest.fn()
const mockUtilisateurCourant = jest.fn()

jest.mock('@/lib/ia/anthropic', () => ({
  getAnthropicClient: jest.fn(() => ({ messages: { create: mockCreate } })),
  MODELE_IMPORT: 'modele-test',
}))

jest.mock('@/lib/actions/ia-usage', () => ({
  enregistrerUsageIA: mockEnregistrerUsageIA,
  // Le garde consulte aussi le solde : sans releve, il laisse passer.
  soldeIA: jest.fn(async () => ({
    consommeUsd: 0, restantUsd: null, releveAt: null, soldeReleveUsd: null,
  })),
}))

jest.mock('@/lib/supabase/session', () => ({
  utilisateurCourant: mockUtilisateurCourant,
}))

import { POST } from './route'

function reponseIA(json: Record<string, unknown>) {
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(json) }],
    usage: { input_tokens: 12, output_tokens: 34 },
  })
}

function requeteImport(matiere?: string) {
  return new Request('http://localhost/api/ia-manuel', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      texte: 'Une programmation suffisamment longue pour declencher l import automatique.',
      ...(matiere ? { matiere } : {}),
    }),
  })
}

describe('POST /api/ia-manuel', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockEnregistrerUsageIA.mockReset()
    // Par defaut, une enseignante connectee : chaque test verifie le reste.
    mockUtilisateurCourant.mockReset()
    mockUtilisateurCourant.mockResolvedValue({ id: 'prof-1' })
  })

  test('refuse un appel sans utilisateur connecte, sans toucher a l IA', async () => {
    mockUtilisateurCourant.mockResolvedValue(null)

    const reponse = await POST(requeteImport())

    expect(reponse.status).toBe(401)
    expect(await reponse.json()).toEqual({ error: 'Connexion requise.' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('renvoie un manuel avec les metadonnees normalisees au premier niveau', async () => {
    reponseIA({
      matiere: ' Francais ',
      nom_methode: " Les P'tites Poules ",
      type_document: 'manuel',
      periode_numero: 2.5,
      confiance_detection: 1.4,
      avertissements: [
        { semaine: 4, message: ' Case illisible, j’ai lu « lezard » sans certitude ' },
        ' document partiel ',
        42,
        '',
      ],
      base_calage: 'numeros',
      semaines: [{ numero: 4, items: [' a ', 7], pages: ' p. 3 ', mots_exemple: [' ami ', null] }],
      periodes: [],
    })

    const reponse = await POST(requeteImport())

    expect(await reponse.json()).toEqual({
      matiere: 'Francais',
      nom_methode: "Les P'tites Poules",
      periode_numero: null,
      confiance_detection: 1,
      // L'avertissement situe garde sa semaine ; une simple chaine est toleree et
      // devient un avertissement global ; le vide et le non-texte disparaissent.
      avertissements: [
        { semaine: 4, message: 'Case illisible, j’ai lu « lezard » sans certitude' },
        { semaine: null, message: 'document partiel' },
      ],
      type_document: 'manuel',
      // La semaine 4 reste la semaine 4 : renumeroter decalait toute l'annee.
      progression: [{ numero: 4, items: ['a'], pages: 'p. 3', mots_exemple: ['ami'] }],
      periodes: [],
      base_calage: 'numeros',
    })
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      system: expect.stringContaining("Aucun indice de matière n'est fourni"),
    }))
    // L objet `usage` complet est transmis, cache compris : c est la couche
    // ia-usage qui sait quoi facturer, pas la route.
    expect(mockEnregistrerUsageIA).toHaveBeenCalledWith({
      route: 'ia-manuel',
      modele: 'modele-test',
      usage: { input_tokens: 12, output_tokens: 34 },
    })
  })

  test('renvoie un planning de periode avec les deux tableaux', async () => {
    reponseIA({
      matiere: ' Mathématiques ',
      nom_methode: ' Compter ',
      type_document: 'periode',
      periode_numero: 3,
      confiance_detection: -0.2,
      avertissements: [false, ' manque une page '],
      semaines: [{ numero: 9, items: [' Compter jusqu a 10 '], pages: '', mots_exemple: [] }],
      periodes: [],
    })

    const reponse = await POST(requeteImport('francais'))

    expect(await reponse.json()).toEqual({
      matiere: 'Mathématiques',
      nom_methode: 'Compter',
      periode_numero: 3,
      confiance_detection: 0,
      avertissements: [{ semaine: null, message: 'manque une page' }],
      type_document: 'periode',
      progression: [{ numero: 9, items: ['Compter jusqu a 10'], pages: '', mots_exemple: [] }],
      periodes: [],
      // L'IA n'a rien declare : on retombe sur le calage par ordre.
      base_calage: 'ordre',
    })
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      system: expect.stringContaining('Indice facultatif'),
    }))
  })

  test('renvoie une programmation avec une progression vide', async () => {
    reponseIA({
      matiere: ' Questionner le monde ',
      nom_methode: ' Explorer ',
      type_document: 'programmation',
      periode_numero: 6,
      confiance_detection: 0.75,
      avertissements: [' tableau annuel '],
      semaines: [],
      periodes: [{ numero: 2, domaines: [{ nom: ' Vivant ', items: [' Les saisons '] }] }],
    })

    const reponse = await POST(requeteImport())

    expect(await reponse.json()).toEqual({
      matiere: 'Questionner le monde',
      nom_methode: 'Explorer',
      periode_numero: null,
      confiance_detection: 0.75,
      avertissements: [{ semaine: null, message: 'tableau annuel' }],
      type_document: 'programmation',
      progression: [],
      periodes: [{ numero: 2, domaines: [{ nom: 'Vivant', items: ['Les saisons'] }] }],
    })
  })
})
