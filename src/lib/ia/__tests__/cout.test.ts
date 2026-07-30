import { coutUsd, TARIFS_USD_PAR_MTOK, usageDepuisReponse, type UsageIA } from '../cout'

const RIEN: UsageIA = { input: 0, cacheCreation: 0, cacheRead: 0, output: 0 }

describe('coutUsd', () => {
  test('facture l entree et la sortie au tarif du modele', () => {
    const cout = coutUsd('claude-sonnet-4-6', { ...RIEN, input: 1_000_000, output: 1_000_000 })
    expect(cout).toBeCloseTo(3 + 15, 6)
  })

  test('facture l ecriture de cache 1,25 fois le tarif d entree', () => {
    const cout = coutUsd('claude-sonnet-4-6', { ...RIEN, cacheCreation: 1_000_000 })
    expect(cout).toBeCloseTo(3 * 1.25, 6)
  })

  test('facture la lecture de cache un dixieme du tarif d entree', () => {
    const cout = coutUsd('claude-sonnet-4-6', { ...RIEN, cacheRead: 1_000_000 })
    expect(cout).toBeCloseTo(3 * 0.1, 6)
  })

  test('rien consomme, rien facture', () => {
    expect(coutUsd('claude-sonnet-4-6', RIEN)).toBe(0)
  })

  test('un modele inconnu est facture au tarif le plus cher connu', () => {
    // Le jour ou l on changera de modele sans toucher a ce fichier, la jauge
    // doit surestimer, jamais sous-estimer : c est un garde-fou de budget.
    const plusCher = Math.max(...Object.values(TARIFS_USD_PAR_MTOK).map(t => t.output))
    const cout = coutUsd('modele-invente-demain', { ...RIEN, output: 1_000_000 })
    expect(cout).toBeCloseTo(plusCher, 6)
  })

  test('le tarif Opus est plus cher que le tarif Sonnet', () => {
    const usage: UsageIA = { ...RIEN, input: 1_000_000, output: 1_000_000 }
    expect(coutUsd('claude-opus-4-8', usage)).toBeGreaterThan(coutUsd('claude-sonnet-4-6', usage))
  })
})

describe('usageDepuisReponse', () => {
  test('lit les quatre compteurs de tokens, cache compris', () => {
    expect(usageDepuisReponse({
      input_tokens: 10,
      output_tokens: 20,
      cache_creation_input_tokens: 30,
      cache_read_input_tokens: 40,
    })).toEqual({ input: 10, output: 20, cacheCreation: 30, cacheRead: 40 })
  })

  test('les champs de cache absents valent zero, pas NaN', () => {
    expect(usageDepuisReponse({ input_tokens: 5, output_tokens: 7 }))
      .toEqual({ input: 5, output: 7, cacheCreation: 0, cacheRead: 0 })
  })

  test('une reponse sans usage ne fait pas planter l enregistrement', () => {
    expect(usageDepuisReponse(undefined)).toEqual(RIEN)
    expect(usageDepuisReponse(null)).toEqual(RIEN)
  })

  test('une valeur non numerique est ignoree', () => {
    expect(usageDepuisReponse({ input_tokens: 'beaucoup', output_tokens: 3 }))
      .toEqual({ ...RIEN, output: 3 })
  })
})
