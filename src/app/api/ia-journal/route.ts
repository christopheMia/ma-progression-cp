import { NextResponse } from 'next/server'
import { getAnthropicClient, MODELE_CHAT } from '@/lib/ia/anthropic'
import { SYSTEM_JOURNAL, userJournal } from '@/lib/ia/prompts'
import { messageErreurIA } from '@/lib/ia/erreurs'

export const maxDuration = 60

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    deroulements: { type: 'array', items: { type: 'string' } },
  },
  required: ['deroulements'],
} as const

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const numeroSemaine = typeof body.numeroSemaine === 'number' ? body.numeroSemaine : 0
    const creneaux = Array.isArray(body.creneaux) ? body.creneaux : []
    const francais = Array.isArray(body.francais) ? body.francais.filter((s: unknown) => typeof s === 'string') : []
    const maths = Array.isArray(body.maths) ? body.maths.filter((s: unknown) => typeof s === 'string') : []

    if (creneaux.length === 0) return NextResponse.json({ deroulements: [] })

    const client = getAnthropicClient()
    const result = await client.messages.create({
      model: MODELE_CHAT,
      max_tokens: 1500,
      system: SYSTEM_JOURNAL,
      output_config: {
        format: {
          type: 'json_schema',
          schema: SCHEMA,
        },
      },
      messages: [{ role: 'user', content: userJournal({ numeroSemaine, creneaux, francais, maths }) }],
    })

    const block = result.content.find(b => b.type === 'text')
    const raw = block && 'text' in block ? block.text : '{}'
    let deroulements: string[] = []
    try {
      deroulements = JSON.parse(raw).deroulements ?? []
    } catch {
      deroulements = []
    }
    return NextResponse.json({ deroulements, usage: result.usage })
  } catch (err) {
    console.error('ia-journal error:', err)
    const { message, status } = messageErreurIA(err)
    return NextResponse.json({ error: message }, { status })
  }
}
