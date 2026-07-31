import {
  getAnthropicClient,
  MODELE_CHAT,
  MODELE_COURT,
  MODELE_IMPORT,
  REFLEXION_ETEINTE,
} from '../anthropic'
import { TARIFS_USD_PAR_MTOK } from '../cout'

describe('getAnthropicClient', () => {
  const old = process.env.ANTHROPIC_API_KEY

  afterEach(() => { process.env.ANTHROPIC_API_KEY = old })

  test('throw un message clair si la clé est absente', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(() => getAnthropicClient()).toThrow(/ANTHROPIC_API_KEY/)
  })

  test('retourne un client si la clé est présente', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    const client = getAnthropicClient()
    expect(client).toBeDefined()
    expect(client.messages).toBeDefined()
  })
})

describe('modèles', () => {
  // La vraie classe de bug : changer de modèle et oublier son tarif. La jauge
  // retomberait alors sur le repli « tarif le plus cher connu », qui protège du
  // sous-comptage mais fausse quand même l'estimation du crédit restant.
  test.each([
    ['import', MODELE_IMPORT],
    ['chat', MODELE_CHAT],
    ['court', MODELE_COURT],
  ])('le modèle %s est au catalogue de tarifs', (_role, modele) => {
    expect(TARIFS_USD_PAR_MTOK[modele]).toBeDefined()
  })

  // Sur Sonnet 5, ne rien passer ACTIVE la réflexion : ce n'est plus le neutre.
  // Les routes d'import doivent donc l'éteindre explicitement.
  test('la réflexion étendue est bien une extinction explicite', () => {
    expect(REFLEXION_ETEINTE.type).toBe('disabled')
  })
})
