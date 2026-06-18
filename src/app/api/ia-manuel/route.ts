import { NextResponse } from 'next/server'
import { getAnthropicClient, MODELE_IMPORT } from '@/lib/ia/anthropic'
import { PROGRESSION_JSON_SCHEMA, normalizeProgression } from '@/lib/ia/schema'
import { systemImport, userImport } from '@/lib/ia/prompts'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? ''
    let texte = ''

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('pdf') as File | null
      const texteColle = (form.get('texte') as string | null) ?? ''
      if (file) {
        if (file.size > 30 * 1024 * 1024) {
          return NextResponse.json({ error: 'Fichier trop volumineux (max 30 Mo)' }, { status: 400 })
        }
        // Chargement paresseux de pdf-parse : uniquement quand un vrai PDF est déposé
        // (évite tout plantage du module pour le simple collage de texte).
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ text: string }>
        const data = await pdfParse(Buffer.from(await file.arrayBuffer()))
        texte = data.text ?? ''
      } else {
        texte = texteColle
      }
    } else {
      const body = await request.json()
      texte = typeof body.texte === 'string' ? body.texte : ''
    }

    texte = texte.trim()
    if (texte.length < 20) {
      return NextResponse.json({ error: 'Texte du manuel vide ou trop court.' }, { status: 400 })
    }

    const client = getAnthropicClient()
    const message = await client.messages.create({
      model: MODELE_IMPORT,
      max_tokens: 16000,
      // Pas de "thinking" : l'extraction d'un sommaire n'a pas besoin de réflexion
      // étendue, et ça dépasserait le temps max des fonctions serverless Vercel.
      system: systemImport('francais'),
      output_config: {
        format: {
          type: 'json_schema',
          schema: PROGRESSION_JSON_SCHEMA,
        },
      },
      messages: [{ role: 'user', content: userImport(texte) }],
    })

    // Récupère le bloc texte (JSON garanti par le schéma)
    const jsonBlock = message.content.find(b => b.type === 'text')
    const parsed = jsonBlock && 'text' in jsonBlock ? JSON.parse(jsonBlock.text) : { semaines: [] }
    const progression = normalizeProgression(parsed.semaines ?? [])

    if (progression.length === 0) {
      return NextResponse.json(
        { error: "L'IA n'a pas reconnu de progression. Essayez le sommaire en texte ou l'import CSV." },
        { status: 422 }
      )
    }
    return NextResponse.json({ progression })
  } catch (err) {
    console.error('ia-manuel error:', err)
    const msg = err instanceof Error && /ANTHROPIC_API_KEY/.test(err.message)
      ? 'Service IA non configuré (clé API manquante).'
      : "Erreur lors de l'analyse par l'IA. Réessayez ou utilisez l'import CSV."
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
