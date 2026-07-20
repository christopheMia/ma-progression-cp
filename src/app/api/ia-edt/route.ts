import { NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient, MODELE_IMPORT } from '@/lib/ia/anthropic'
import { EDT_JSON_SCHEMA, normaliserEdtImporte } from '@/lib/ia/schema-edt'
import { SYSTEM_IMPORT_EDT, userImportEdt } from '@/lib/ia/prompts'
import { messageErreurIA } from '@/lib/ia/erreurs'
import { enregistrerUsageIA } from '@/lib/actions/ia-usage'

export const maxDuration = 60

/**
 * Importe un emploi du temps depuis un PDF. Le fichier est envoye TEL QUEL au
 * modele (bloc `document`) : il doit voir la grille pour en lire les lignes et
 * les colonnes, un texte aplati ne suffit pas.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const fichiers = form.getAll('pdf').filter((f): f is File => f instanceof File)
    if (!fichiers.length) {
      return NextResponse.json({ error: 'Aucun PDF reçu.' }, { status: 400 })
    }

    // Limite du corps de requete des fonctions serverless Vercel (~4,5 Mo).
    const total = fichiers.reduce((n, f) => n + f.size, 0)
    if (total > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'PDF trop volumineux (max 4 Mo). Envoyez seulement la page de l’emploi du temps.' },
        { status: 413 }
      )
    }

    const documents: Anthropic.ContentBlockParam[] = []
    for (const f of fichiers) {
      documents.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: Buffer.from(await f.arrayBuffer()).toString('base64'),
        },
      })
    }

    const client = getAnthropicClient()
    const message = await client.messages.create({
      model: MODELE_IMPORT,
      max_tokens: 16000,
      system: SYSTEM_IMPORT_EDT,
      output_config: {
        format: { type: 'json_schema', schema: EDT_JSON_SCHEMA },
      },
      messages: [{
        role: 'user',
        content: [...documents, { type: 'text', text: userImportEdt() }],
      }],
    })

    await enregistrerUsageIA(message.usage?.input_tokens ?? 0, message.usage?.output_tokens ?? 0)

    const bloc = message.content.find(b => b.type === 'text')
    const parsed = bloc && 'text' in bloc ? JSON.parse(bloc.text) : { creneaux: [] }
    const creneaux = normaliserEdtImporte(parsed.creneaux ?? [])

    if (creneaux.length === 0) {
      return NextResponse.json(
        { error: "L'IA n'a reconnu aucun créneau dans ce PDF. Vérifiez qu'il contient bien la grille de l'emploi du temps." },
        { status: 422 }
      )
    }
    return NextResponse.json({ creneaux })
  } catch (err) {
    console.error('ia-edt error:', err)
    const { message, status } = messageErreurIA(err)
    return NextResponse.json({ error: message }, { status })
  }
}
