import { NextResponse } from 'next/server'
import { getAnthropicClient, MODELE_CHAT } from '@/lib/ia/anthropic'
import { systemAssistant } from '@/lib/ia/prompts'
import { messageErreurIA } from '@/lib/ia/erreurs'
import { enregistrerUsageIA } from '@/lib/actions/ia-usage'

export const maxDuration = 60

/** Bornes de l'historique renvoye par le client, pour ne pas gonfler l'appel. */
const TOURS_MAX = 10
const LONGUEUR_MESSAGE_MAX = 4000

type TourConversation = { role: 'user' | 'assistant'; content: string }

function estRole(valeur: unknown): valeur is TourConversation['role'] {
  return valeur === 'user' || valeur === 'assistant'
}

function toursValides(valeur: unknown): TourConversation[] {
  if (!Array.isArray(valeur)) return []
  return valeur.flatMap(brut => {
    if (typeof brut !== 'object' || brut === null) return []
    const tour = brut as Record<string, unknown>
    const role = tour.role
    const content = tour.content
    if (!estRole(role)) return []
    if (typeof content !== 'string' || !content.trim()) return []
    return [{ role, content: content.slice(0, LONGUEUR_MESSAGE_MAX) }]
  }).slice(-TOURS_MAX)
}

function chaines(valeur: unknown): string[] {
  return Array.isArray(valeur)
    ? valeur.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : []
}

/**
 * Conversation libre avec l'assistant de l'application.
 *
 * Distincte de /api/ia-chat, qui corrige une progression et rend une sortie
 * structuree. Ici la reponse est du texte, parce qu'on repond a une question,
 * on ne modifie rien.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!message) {
      return NextResponse.json({ error: 'Message vide.' }, { status: 400 })
    }

    const client = getAnthropicClient()
    const result = await client.messages.create({
      model: MODELE_CHAT,
      max_tokens: 2000,
      system: [{
        type: 'text',
        text: systemAssistant({
          prenom: typeof body.prenom === 'string' ? body.prenom : undefined,
          rentreeDate: typeof body.rentree_date === 'string' ? body.rentree_date : undefined,
          matieres: chaines(body.matieres),
        }),
        cache_control: { type: 'ephemeral' },
      }],
      messages: [
        ...toursValides(body.historique),
        { role: 'user', content: message.slice(0, LONGUEUR_MESSAGE_MAX) },
      ],
    })

    await enregistrerUsageIA(result.usage?.input_tokens ?? 0, result.usage?.output_tokens ?? 0)

    const bloc = result.content.find(b => b.type === 'text')
    const reponse = bloc && 'text' in bloc ? bloc.text.trim() : ''
    if (!reponse) {
      return NextResponse.json(
        { error: "L'assistant n'a rien répondu. Reformule ta question." },
        { status: 502 },
      )
    }
    return NextResponse.json({ reponse })
  } catch (err) {
    console.error('assistant error:', err)
    const { message, status } = messageErreurIA(err)
    return NextResponse.json({ error: message }, { status })
  }
}
