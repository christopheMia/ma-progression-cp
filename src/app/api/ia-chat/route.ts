import { NextResponse } from 'next/server'
import { getAnthropicClient, MODELE_CHAT } from '@/lib/ia/anthropic'
import { normalizeProgression } from '@/lib/ia/schema'
import { systemChat } from '@/lib/ia/prompts'
import type { ProgressionSemaine } from '@/data/manuels'
import { messageErreurIA } from '@/lib/ia/erreurs'

export const maxDuration = 60

const CHAT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    progression: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          numero: { type: 'integer' },
          items: { type: 'array', items: { type: 'string' } },
          pages: { type: 'string' },
          mots_exemple: { type: 'array', items: { type: 'string' } },
        },
        required: ['numero', 'items', 'pages', 'mots_exemple'],
      },
    },
    reponse: { type: 'string' },
  },
  required: ['progression', 'reponse'],
} as const

type ChatTurn = { role: 'user' | 'assistant'; content: string }

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const progression = (body.progression ?? []) as ProgressionSemaine[]
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const prenom = typeof body.prenom === 'string' ? body.prenom : undefined
    const historique = (Array.isArray(body.historique) ? body.historique : []) as ChatTurn[]

    if (!message) {
      return NextResponse.json({ error: 'Message vide.' }, { status: 400 })
    }

    const client = getAnthropicClient()
    // On borne l'historique aux 10 derniers échanges (cf. design).
    const hist = historique.slice(-10).map(t => ({ role: t.role, content: t.content }))

    const result = await client.messages.create({
      model: MODELE_CHAT,
      max_tokens: 16000,
      system: [
        { type: 'text', text: systemChat(prenom), cache_control: { type: 'ephemeral' } },
        {
          type: 'text',
          text: `Progression actuelle :\n${JSON.stringify(progression)}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      output_config: { format: { type: 'json_schema', schema: CHAT_SCHEMA } },
      messages: [...hist, { role: 'user', content: message }],
    })

    const block = result.content.find(b => b.type === 'text')
    const parsed = block && 'text' in block ? JSON.parse(block.text) : { progression, reponse: '' }
    return NextResponse.json({
      progression: normalizeProgression(parsed.progression ?? progression),
      reponse: typeof parsed.reponse === 'string' ? parsed.reponse : 'C’est fait !',
    })
  } catch (err) {
    console.error('ia-chat error:', err)
    const { message, status } = messageErreurIA(err)
    return NextResponse.json({ error: message }, { status })
  }
}
