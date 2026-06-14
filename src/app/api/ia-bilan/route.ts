import { NextResponse } from 'next/server'
import { getAnthropicClient, MODELE_CHAT } from '@/lib/ia/anthropic'
import { SYSTEM_BILAN, userBilan } from '@/lib/ia/prompts'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const numeroSemaine = typeof body.numeroSemaine === 'number' ? body.numeroSemaine : 0
    const sonsAcquis = Array.isArray(body.sonsAcquis) ? body.sonsAcquis.filter((s: unknown) => typeof s === 'string') : []
    const sonsNonAcquis = Array.isArray(body.sonsNonAcquis) ? body.sonsNonAcquis.filter((s: unknown) => typeof s === 'string') : []
    const statut = typeof body.statut === 'string' ? body.statut : null

    const client = getAnthropicClient()
    const result = await client.messages.create({
      model: MODELE_CHAT,
      max_tokens: 1000,
      system: SYSTEM_BILAN,
      messages: [{ role: 'user', content: userBilan({ numeroSemaine, sonsAcquis, sonsNonAcquis, statut }) }],
    })

    const block = result.content.find(b => b.type === 'text')
    const bilan = block && 'text' in block ? block.text.trim() : ''
    if (!bilan) {
      return NextResponse.json({ error: "L'IA n'a pas pu rédiger le bilan." }, { status: 422 })
    }
    return NextResponse.json({ bilan })
  } catch (err) {
    console.error('ia-bilan error:', err)
    const msg = err instanceof Error && /ANTHROPIC_API_KEY/.test(err.message)
      ? 'Service IA non configuré (clé API manquante).'
      : "Erreur lors de la génération du bilan. Réessayez."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
