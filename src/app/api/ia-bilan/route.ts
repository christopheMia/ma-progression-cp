import { NextResponse } from 'next/server'
import { getAnthropicClient, MODELE_CHAT } from '@/lib/ia/anthropic'
import { SYSTEM_BILAN, userBilan } from '@/lib/ia/prompts'
import { messageErreurIA } from '@/lib/ia/erreurs'
import { enregistrerUsageIA } from '@/lib/actions/ia-usage'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const numeroSemaine = typeof body.numeroSemaine === 'number' ? body.numeroSemaine : 0
    const matiere = typeof body.matiere === 'string' ? body.matiere : 'francais'
    const itemsAcquis = Array.isArray(body.itemsAcquis) ? body.itemsAcquis.filter((s: unknown) => typeof s === 'string') : []
    const itemsNonAcquis = Array.isArray(body.itemsNonAcquis) ? body.itemsNonAcquis.filter((s: unknown) => typeof s === 'string') : []
    const statut = typeof body.statut === 'string' ? body.statut : null

    const client = getAnthropicClient()
    const result = await client.messages.create({
      model: MODELE_CHAT,
      max_tokens: 1000,
      system: SYSTEM_BILAN,
      messages: [{ role: 'user', content: userBilan({ numeroSemaine, matiere, itemsAcquis, itemsNonAcquis, statut }) }],
    })

    await enregistrerUsageIA(result.usage?.input_tokens ?? 0, result.usage?.output_tokens ?? 0)

    const block = result.content.find(b => b.type === 'text')
    const bilan = block && 'text' in block ? block.text.trim() : ''
    if (!bilan) {
      return NextResponse.json({ error: "L'IA n'a pas pu rédiger le bilan." }, { status: 422 })
    }
    return NextResponse.json({ bilan })
  } catch (err) {
    console.error('ia-bilan error:', err)
    const { message, status } = messageErreurIA(err)
    return NextResponse.json({ error: message }, { status })
  }
}
