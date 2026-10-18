import { NextResponse } from 'next/server'
import { getAnthropicClient, MODELE_REGLE } from '@/lib/ia/anthropic'
import { SYSTEM_REGLE, userRegle } from '@/lib/ia/prompts'
import { REGLE_JSON_SCHEMA, lireReponseRegle } from '@/lib/ia/schema-regle'
import { messageErreurIA, messageReponseIncomplete } from '@/lib/ia/erreurs'
import { enregistrerUsageIA } from '@/lib/actions/ia-usage'
import { casesDeMaClasse } from '@/lib/actions/regles-rangement'
import { garderAppelIA } from '@/lib/ia/garde'

export const maxDuration = 30

/**
 * « Avec mes mots » (carnet de rangement, 18/10/2026) : l'enseignante dit où
 * elle fait une séance, l'IA rend une règle qu'elle validera (« C'est ça »).
 * Les cases sont lues en base, jamais reçues du navigateur : la réponse est
 * vérifiée contre son vrai emploi du temps. Rien n'est enregistré ici.
 */
export async function POST(request: Request) {
  const refus = await garderAppelIA()
  if (refus) return refus
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const phrase = typeof body.phrase === 'string' ? body.phrase.trim() : ''
    const type = typeof body.type === 'string' ? body.type.trim() : ''
    if (phrase.length < 3 || phrase.length > 500) {
      return NextResponse.json({ error: 'Dis-moi en une phrase où tu fais cette séance.' }, { status: 400 })
    }
    const cases = await casesDeMaClasse()
    if (!cases.ok) return NextResponse.json({ error: cases.message }, { status: 500 })
    if (cases.valeur.length === 0) {
      return NextResponse.json(
        { error: 'Ton emploi du temps est vide : remplis-le d’abord dans Paramètres.' },
        { status: 422 },
      )
    }

    const client = getAnthropicClient()
    const message = await client.messages.create({
      model: MODELE_REGLE,
      // Haiku 5.5 réfléchit par défaut et la réflexion compte dans ce plafond :
      // de la marge pour une réponse de cinq champs.
      max_tokens: 2000,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: REGLE_JSON_SCHEMA },
      },
      system: SYSTEM_REGLE,
      messages: [{ role: 'user', content: userRegle({ phrase, type: type || undefined, cases: cases.valeur }) }],
    })

    await enregistrerUsageIA({ route: 'ia-regle', modele: MODELE_REGLE, usage: message.usage })

    // Usage enregistré d'abord : les jetons produits sont facturés même coupés.
    const incomplete = messageReponseIncomplete(message.stop_reason, 'Réessaie avec une phrase plus courte.')
    if (incomplete) return NextResponse.json({ error: incomplete.message }, { status: incomplete.status })

    // Une réponse peut commencer par des blocs de réflexion : on lit le texte.
    const bloc = message.content.find(b => b.type === 'text')
    let brut: unknown = null
    try {
      brut = bloc && 'text' in bloc ? JSON.parse(bloc.text) : null
    } catch {
      brut = null
    }
    return NextResponse.json({ reponse: lireReponseRegle(brut, cases.valeur, type || undefined) })
  } catch (err) {
    console.error('ia-regle error:', err)
    const { message, status } = messageErreurIA(err)
    return NextResponse.json({ error: message }, { status })
  }
}
