import { NextResponse } from 'next/server'
import { getAnthropicClient, MODELE_COURT } from '@/lib/ia/anthropic'
import { SYSTEM_BILAN, userBilan } from '@/lib/ia/prompts'
import { messageErreurIA, messageReponseIncomplete } from '@/lib/ia/erreurs'
import { enregistrerUsageIA } from '@/lib/actions/ia-usage'
import { garderAppelIA } from '@/lib/ia/garde'

export const maxDuration = 60

export async function POST(request: Request) {
  const refus = await garderAppelIA()
  if (refus) return refus
  try {
    const body = await request.json()
    const numeroSemaine = typeof body.numeroSemaine === 'number' ? body.numeroSemaine : 0
    const matiere = typeof body.matiere === 'string' ? body.matiere : 'francais'
    const itemsAcquis = Array.isArray(body.itemsAcquis) ? body.itemsAcquis.filter((s: unknown) => typeof s === 'string') : []
    const itemsNonAcquis = Array.isArray(body.itemsNonAcquis) ? body.itemsNonAcquis.filter((s: unknown) => typeof s === 'string') : []
    const statut = typeof body.statut === 'string' ? body.statut : null

    const client = getAnthropicClient()
    const result = await client.messages.create({
      // Haiku : rédiger un paragraphe court à partir d'un contexte déjà mâché.
      model: MODELE_COURT,
      max_tokens: 1000,
      system: SYSTEM_BILAN,
      messages: [{ role: 'user', content: userBilan({ numeroSemaine, matiere, itemsAcquis, itemsNonAcquis, statut }) }],
    })

    await enregistrerUsageIA({ route: 'ia-bilan', modele: MODELE_COURT, usage: result.usage })

    // Usage enregistré d'abord : les tokens produits sont facturés même coupés.
    const incomplete = messageReponseIncomplete(
      result.stop_reason,
      'Réessaie avec moins d’items cochés pour cette semaine.',
    )
    if (incomplete) {
      return NextResponse.json({ error: incomplete.message }, { status: incomplete.status })
    }

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
