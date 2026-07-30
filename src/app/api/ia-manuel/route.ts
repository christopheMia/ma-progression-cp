import { NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient, MODELE_IMPORT } from '@/lib/ia/anthropic'
import { normalizeProgression, numerosSemainesFiables } from '@/lib/ia/schema'
import { systemImportAutomatique, userImport, userImportDocument } from '@/lib/ia/prompts'
import { normalizeProgrammation } from '@/lib/ia/schema-programmation'
import {
  AUTO_IMPORT_JSON_SCHEMA,
  avertissementsImport,
  baseCalageImport,
  periodeDocumentImport,
  typeDocumentImport,
} from '@/lib/ia/schema-import-auto'
import { messageErreurIA } from '@/lib/ia/erreurs'
import { enregistrerUsageIA } from '@/lib/actions/ia-usage'
import { garderAppelIA } from '@/lib/ia/garde'

export const maxDuration = 60

function chaineNormalisee(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function confianceNormalisee(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}


function normaliserMetaImport(value: Record<string, unknown>) {
  return {
    matiere: chaineNormalisee(value.matiere),
    nom_methode: chaineNormalisee(value.nom_methode),
    periode_numero: periodeDocumentImport(value.periode_numero),
    confiance_detection: confianceNormalisee(value.confiance_detection),
    avertissements: avertissementsImport(value.avertissements),
  }
}

export async function POST(request: Request) {
  const refus = await garderAppelIA()
  if (refus) return refus
  try {
    const contentType = request.headers.get('content-type') ?? ''
    let texte = ''
    let matiere = ''
    let rentreeDate = ''
    // PDF joints tels quels : le modele lit alors la MISE EN PAGE (tableaux,
    // lignes, colonnes) au lieu d'un texte aplati. C'est la voie haute fidelite.
    const pdfsBase64: string[] = []

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const fichiers = form.getAll('pdf').filter((f): f is File => f instanceof File)
      const texteColle = (form.get('texte') as string | null) ?? ''
      const matiereRaw = (form.get('matiere') as string | null) ?? ''
      if (matiereRaw.trim()) matiere = matiereRaw.trim()
      const rentreeRaw = (form.get('rentree_date') as string | null) ?? ''
      if (rentreeRaw.trim()) rentreeDate = rentreeRaw.trim()

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
      if (typeof body.rentree_date === 'string' && body.rentree_date.trim()) {
        rentreeDate = body.rentree_date.trim()
      }
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
      system: systemImportAutomatique(matiere || undefined, rentreeDate || undefined),
      output_config: {
        format: {
          type: 'json_schema',
          schema: AUTO_IMPORT_JSON_SCHEMA,
        },
      },
      messages: [{ role: 'user', content: contenuUtilisateur }],
    })

    await enregistrerUsageIA({ route: 'ia-manuel', modele: MODELE_IMPORT, usage: message.usage })

    // Récupère le bloc texte (JSON garanti par le schéma)
    const jsonBlock = message.content.find(b => b.type === 'text')
    const parsedBrut: unknown = jsonBlock && 'text' in jsonBlock
      ? JSON.parse(jsonBlock.text)
      : { semaines: [] }
    const parsed: Record<string, unknown> = parsedBrut
      && typeof parsedBrut === 'object'
      && !Array.isArray(parsedBrut)
      ? parsedBrut as Record<string, unknown>
      : {}

    const typeDocument = typeDocumentImport(parsed.type_document)
    if (!typeDocument) {
      return NextResponse.json({ error: "L'IA n'a pas reconnu le type de document." }, { status: 422 })
    }
    const meta = normaliserMetaImport(parsed)

    if (typeDocument === 'programmation') {
      const periodes = normalizeProgrammation(parsed)
      if (periodes.length === 0) {
        return NextResponse.json(
          { error: "L'IA n'a pas reconnu de programmation annuelle. Verifie que le document presente bien un tableau periodes x domaines." },
          { status: 422 }
        )
      }
      return NextResponse.json({ ...meta, type_document: typeDocument, progression: [], periodes })
    }

    const semainesBrutes = Array.isArray(parsed.semaines) ? parsed.semaines : []
    const progression = normalizeProgression(semainesBrutes)

    if (progression.length === 0) {
      return NextResponse.json(
        { error: "L'IA n'a pas reconnu de progression. Essayez le sommaire en texte ou l'import CSV." },
        { status: 422 }
      )
    }
    // Si les numeros n'etaient pas exploitables, normalizeProgression a numerote
    // dans l'ordre recu: quoi que l'IA ait declare, le calage repose sur l'ordre.
    const baseCalage = numerosSemainesFiables(semainesBrutes)
      ? baseCalageImport(parsed.base_calage)
      : 'ordre'
    return NextResponse.json({
      ...meta,
      type_document: typeDocument,
      progression,
      periodes: [],
      base_calage: baseCalage,
    })
  } catch (err) {
    console.error('ia-manuel error:', err)
    const { message, status } = messageErreurIA(err)
    return NextResponse.json({ error: message }, { status })
  }
}
