import { getAnthropicClient } from '../anthropic'

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
