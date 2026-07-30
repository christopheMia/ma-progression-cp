import {
  coutUsd,
  sommeCoutDepuis,
  TARIFS_USD_PAR_MTOK,
  usageDepuisReponse,
  type UsageIA,
} from '../cout'

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

describe('sommeCoutDepuis', () => {
  // Ce filtre etait un `gte` SQL, ce qui obligeait a attendre la lecture du
  // releve AVANT de demander les lignes : deux allers-retours en serie a
  // chaque affichage. Filtrer ici permet de lancer les deux requetes ensemble.
  const lignes = [
    { cout_usd: 0.10, created_at: '2026-07-28T10:00:00.000Z' },
    { cout_usd: 0.20, created_at: '2026-07-30T08:00:00.000Z' },
    { cout_usd: 0.30, created_at: '2026-07-30T12:00:00.000Z' },
  ]

  test('sans releve, tout compte', () => {
    expect(sommeCoutDepuis(lignes, null)).toBeCloseTo(0.6, 6)
  })

  test('avec un releve, seules les lignes a partir du releve comptent', () => {
    expect(sommeCoutDepuis(lignes, '2026-07-30T00:00:00.000Z')).toBeCloseTo(0.5, 6)
  })

  test('une ligne datee exactement du releve compte (meme regle que le gte SQL)', () => {
    expect(sommeCoutDepuis(lignes, '2026-07-30T08:00:00.000Z')).toBeCloseTo(0.5, 6)
  })

  test('tolere un cout absent ou une date absente sans faire echouer la page', () => {
    const abimees = [
      { cout_usd: null, created_at: '2026-07-30T08:00:00.000Z' },
      { cout_usd: 0.25, created_at: null },
      { cout_usd: 0.25, created_at: '2026-07-30T09:00:00.000Z' },
    ]
    // Sans releve, la ligne sans date compte quand meme : on n a aucune raison
    // de l ecarter. Avec un releve, impossible de la situer : elle est ecartee.
    expect(sommeCoutDepuis(abimees, null)).toBeCloseTo(0.5, 6)
    expect(sommeCoutDepuis(abimees, '2026-07-30T00:00:00.000Z')).toBeCloseTo(0.25, 6)
  })

  test('aucune ligne, zero dollar', () => {
    expect(sommeCoutDepuis([], '2026-07-30T00:00:00.000Z')).toBe(0)
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
