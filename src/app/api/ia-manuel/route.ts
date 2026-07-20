import { NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient, MODELE_IMPORT } from '@/lib/ia/anthropic'
import { PROGRESSION_JSON_SCHEMA, normalizeProgression } from '@/lib/ia/schema'
import { systemImport, systemImportPeriode, userImport, userImportDocument } from '@/lib/ia/prompts'
import { messageErreurIA } from '@/lib/ia/erreurs'
import { enregistrerUsageIA } from '@/lib/actions/ia-usage'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? ''
    let texte = ''
    let matiere = 'francais'
    // 'periode' = planning detaille d'une periode (toutes les seances par
    // domaine) ; 'manuel' = sommaire / progression d'un manuel.
    let mode: 'manuel' | 'periode' = 'manuel'
    // PDF joints tels quels : le modele lit alors la MISE EN PAGE (tableaux,
    // lignes, colonnes) au lieu d'un texte aplati. C'est la voie haute fidelite.
    const pdfsBase64: string[] = []

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const fichiers = form.getAll('pdf').filter((f): f is File => f instanceof File)
      const texteColle = (form.get('texte') as string | null) ?? ''
      const matiereRaw = (form.get('matiere') as string | null) ?? ''
      if (matiereRaw.trim()) matiere = matiereRaw.trim()
      if (form.get('mode') === 'periode') mode = 'periode'

      if (fichiers.length) {
        // Les fonctions serverless Vercel plafonnent le corps de requete a ~4,5 Mo.
        // Au-dela, le client doit retomber sur l'extraction de texte cote navigateur.
        const total = fichiers.reduce((n, f) => n + f.size, 0)
        if (total > 4 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'PDF trop volumineux pour la lecture fidèle (max 4 Mo au total). Envoyez seulement les pages de programmation.' },
            { status: 413 }
          )
        }
        for (const f of fichiers) {
          pdfsBase64.push(Buffer.from(await f.arrayBuffer()).toString('base64'))
        }
      } else {
        texte = texteColle
      }
    } else {
      const body = await request.json()
      texte = typeof body.texte === 'string' ? body.texte : ''
      if (typeof body.matiere === 'string' && body.matiere.trim()) matiere = body.matiere.trim()
      if (body.mode === 'periode') mode = 'periode'
    }

    texte = texte.trim()
    if (!pdfsBase64.length && texte.length < 20) {
      return NextResponse.json({ error: 'Texte du manuel vide ou trop court.' }, { status: 400 })
    }

    const contenuUtilisateur: Anthropic.ContentBlockParam[] = pdfsBase64.length
      ? [
          ...pdfsBase64.map((data): Anthropic.ContentBlockParam => ({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data },
          })),
          { type: 'text', text: userImportDocument() },
        ]
      : [{ type: 'text', text: userImport(texte) }]

    const client = getAnthropicClient()
    const message = await client.messages.create({
      model: MODELE_IMPORT,
      max_tokens: 16000,
      // Pas de "thinking" : l'extraction d'un sommaire n'a pas besoin de réflexion
      // étendue, et ça dépasserait le temps max des fonctions serverless Vercel.
      system: mode === 'periode' ? systemImportPeriode(matiere) : systemImport(matiere),
      output_config: {
        format: {
          type: 'json_schema',
          schema: PROGRESSION_JSON_SCHEMA,
        },
      },
      messages: [{ role: 'user', content: contenuUtilisateur }],
    })

    await enregistrerUsageIA(message.usage?.input_tokens ?? 0, message.usage?.output_tokens ?? 0)

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
    const { message, status } = messageErreurIA(err)
    return NextResponse.json({ error: message }, { status })
  }
}
