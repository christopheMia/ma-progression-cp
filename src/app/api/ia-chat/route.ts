import { NextResponse } from 'next/server'
import { getAnthropicClient, MODELE_CHAT, PLAFOND_SORTIE_PROGRESSION } from '@/lib/ia/anthropic'
import { normalizeProgression } from '@/lib/ia/schema'
import { systemChat } from '@/lib/ia/prompts'
import type { ProgressionSemaine } from '@/data/manuels'
import { messageErreurIA, messageReponseIncomplete } from '@/lib/ia/erreurs'
import { enregistrerUsageIA } from '@/lib/actions/ia-usage'
import { garderAppelIA } from '@/lib/ia/garde'

export const maxDuration = 60

/**
 * Le chat corrige une progression et la renvoie ENTIÈRE, mais ne connaît que
 * `items` : pas de champ `seances` ici, volontairement (point 7 de la relecture
 * du 21/08, examiné puis tranché).
 *
 * CE QUI ÉTAIT REPROCHÉ, et qui était vrai : un seul tour de chat reconstruisait
 * les séances depuis `items` seuls, et les `domaine` étaient perdus. La cause
 * n'était pas ce schéma, c'était que `items` ne portait pas le domaine. Depuis
 * la décision de Christophe (`avecDomaine` dans `progression-seances.ts`), une
 * puce s'écrit « Jour 2 : PDE : Voyelles, de Rimbaud (séance 1) » : le jour, le
 * domaine, le texte et l'ordre sont TOUS dans la ligne de texte, et
 * `seancesDepuisItems` les relit. L'aller-retour est donc sans perte, et c'est
 * un test qui le dit (« survit à un aller-retour par ia-chat », schema.test.ts),
 * pas ce commentaire.
 *
 * POURQUOI NE PAS AJOUTER `seances` QUAND MÊME. Le champ est obligatoire dès
 * qu'il existe (sorties structurées strictes) : le modèle devrait réécrire
 * toutes les séances de toutes les semaines à CHAQUE tour de conversation, pour
 * une progression qu'il n'a pas modifiée. Cela triple la sortie, la latence
 * d'une surface interactive, et le risque de réponse coupée, en échange d'une
 * information déjà présente dans `items`. Le jour où le chat devra modifier une
 * séance précise (le placement par créneau de la tâche 5), c'est ce commentaire
 * qu'il faudra relire : il faudra alors ajouter le champ ET la consigne
 * correspondante dans `systemChat`, les deux ensemble.
 *
 * La seule VRAIE contradiction est refermée ici : la progression envoyée en
 * contexte contenait `seances`, un champ que le schéma interdit de rendre. On
 * montrait au modèle une forme qu'on lui refusait ensuite.
 */
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
  const refus = await garderAppelIA()
  if (refus) return refus
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

    // Le contexte ne montre que ce que le schéma autorise à rendre : `seances`
    // en est retiré (voir CHAT_SCHEMA). Ces séances ne disent rien de plus que
    // `items`, qui porte le jour et le domaine dans son texte, et les envoyer
    // revenait à demander au modèle d'ignorer la moitié de ce qu'il lisait.
    const contexte = progression.map(({ seances: _seances, ...semaine }) => semaine)

    const result = await client.messages.create({
      model: MODELE_CHAT,
      // Même plafond que l'import : le chat aussi renvoie la progression
      // entière, et les puces ont grandi de leur domaine.
      max_tokens: PLAFOND_SORTIE_PROGRESSION,
      system: [
        { type: 'text', text: systemChat(prenom), cache_control: { type: 'ephemeral' } },
        {
          type: 'text',
          text: `Progression actuelle :\n${JSON.stringify(contexte)}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      output_config: { format: { type: 'json_schema', schema: CHAT_SCHEMA } },
      messages: [...hist, { role: 'user', content: message }],
    })

    await enregistrerUsageIA({ route: 'ia-chat', modele: MODELE_CHAT, usage: result.usage })

    // Usage enregistré d'abord : les tokens produits sont facturés même coupés.
    const incomplete = messageReponseIncomplete(
      result.stop_reason,
      'Demande une modification plus ciblée, sur moins de semaines à la fois.',
    )
    if (incomplete) {
      return NextResponse.json({ error: incomplete.message }, { status: incomplete.status })
    }

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
