import { NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient, MODELE_IMPORT, REFLEXION_ETEINTE } from '@/lib/ia/anthropic'
import {
  EDT_JSON_SCHEMA,
  normaliserEtCorrigerEdtImporte,
} from '@/lib/ia/schema-edt'
import { systemImportEdt, userImportEdt } from '@/lib/ia/prompts'
import { messageErreurIA, messageReponseIncomplete } from '@/lib/ia/erreurs'
import { enregistrerUsageIA } from '@/lib/actions/ia-usage'
import { garderAppelIA } from '@/lib/ia/garde'

export const maxDuration = 60

/**
 * Importe un emploi du temps, par deux chemins.
 *
 * - `pdf` : le fichier part TEL QUEL au modele (bloc `document`), il doit voir
 *   la grille pour en lire les lignes et les colonnes.
 * - `texte` : la grille vient d'un Word ou d'un Excel, lu dans le navigateur.
 *   L'API n'accepte pas ces formats binaires, mais leurs tableaux sont deja
 *   balises a la source : le texte extrait garde ses lignes et ses colonnes,
 *   il n'y a aucune geometrie a reconstruire comme pour un PDF.
 */
export async function POST(request: Request) {
  const refus = await garderAppelIA()
  if (refus) return refus
  try {
    const form = await request.formData()
    const fichiers = form.getAll('pdf').filter((f): f is File => f instanceof File)
    const texte = typeof form.get('texte') === 'string' ? (form.get('texte') as string).trim() : ''

    if (!fichiers.length && texte.length < 20) {
      return NextResponse.json(
        { error: 'Aucun emploi du temps reçu.' },
        { status: 400 },
      )
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
    if (texte) documents.push({ type: 'text', text: texte })

    const source = fichiers.length ? 'pdf' : 'texte'
    const client = getAnthropicClient()
    const message = await client.messages.create({
      model: MODELE_IMPORT,
      max_tokens: 16000,
      // Réflexion éteinte explicitement : depuis Sonnet 5, ne rien passer
      // l'active. Lire une grille est de la lecture, pas du raisonnement, et la
      // réflexion viendrait manger le budget partagé de max_tokens.
      thinking: REFLEXION_ETEINTE,
      system: systemImportEdt(source),
      output_config: {
        format: { type: 'json_schema', schema: EDT_JSON_SCHEMA },
      },
      messages: [{
        role: 'user',
        content: [...documents, { type: 'text', text: userImportEdt(source) }],
      }],
    })

    await enregistrerUsageIA({ route: 'ia-edt', modele: MODELE_IMPORT, usage: message.usage })

    // Usage enregistré (facturé même tronqué), puis garde-fou avant le parsing.
    const incomplete = messageReponseIncomplete(
      message.stop_reason,
      "Réessaie avec la seule page de l'emploi du temps.",
    )
    if (incomplete) {
      return NextResponse.json({ error: incomplete.message }, { status: incomplete.status })
    }

    const bloc = message.content.find(b => b.type === 'text')
    const parsed = bloc && 'text' in bloc ? JSON.parse(bloc.text) : { creneaux: [] }
    const resultatMatin = normaliserEtCorrigerEdtImporte(parsed.creneaux ?? [])
    if (!resultatMatin.ok) {
      return NextResponse.json(
        { error: resultatMatin.message },
        { status: 422 },
      )
    }
    const creneaux = resultatMatin.creneaux

    if (creneaux.length === 0) {
      return NextResponse.json(
        { error: "L'IA n'a reconnu aucun créneau dans ce document. Vérifiez qu'il contient bien la grille de l'emploi du temps." },
        { status: 422 }
      )
    }
    return NextResponse.json({
      creneaux,
      correction_matin: resultatMatin.modifie
        ? `${resultatMatin.deplacements.length} séance${resultatMatin.deplacements.length > 1 ? 's ont' : ' a'} été remise${resultatMatin.deplacements.length > 1 ? 's' : ''} le matin pour respecter les priorités.`
        : null,
    })
  } catch (err) {
    console.error('ia-edt error:', err)
    const { message, status } = messageErreurIA(err)
    return NextResponse.json({ error: message }, { status })
  }
}
