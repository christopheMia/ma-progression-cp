import { NextResponse } from 'next/server'
import type { ProgressionSemaine } from '@/data/manuels'
// pdf-parse est un module CJS — import statique pour éviter le problème d'interop ESM
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>

export const maxDuration = 30

// Graphèmes courants en CP français
const GRAPHEMES_CP = new Set([
  'a', 'e', 'i', 'o', 'u', 'y',
  'é', 'è', 'ê', 'â', 'à', 'î', 'ô', 'û', 'ù',
  'ou', 'on', 'an', 'en', 'in', 'un',
  'oi', 'au', 'eau', 'eu', 'ui',
  'ain', 'ein', 'ien', 'ion', 'oin',
  'ail', 'eil', 'euil', 'ouil',
  'ai', 'ei', 'oeu',
  'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
  'n', 'p', 'r', 's', 't', 'v', 'w', 'x', 'z',
  'ch', 'ph', 'gn', 'qu', 'gu', 'th',
])

function detectGraphemes(section: string): string[] {
  const found: string[] = []

  // Priorité 1 : notation entre crochets [ou], [an]
  const brackets = [...section.matchAll(/\[([a-zàâéèêëîïôùûüç]{1,4})\]/gi)]
  if (brackets.length > 0) {
    for (const m of brackets) {
      const g = m[1].toLowerCase()
      if (GRAPHEMES_CP.has(g)) found.push(g)
    }
    if (found.length > 0) return [...new Set(found)]
  }

  // Priorité 2 : "le son X", "la lettre X", "phonème : X", "graphème : X"
  const labeled = [...section.matchAll(
    /(?:son|lettre|phonème|graphème)\s*[:«»\[]\s*([a-zàâéèêëîïôùûüç]{1,4})/gi
  )]
  for (const m of labeled) {
    const g = m[1].toLowerCase()
    if (GRAPHEMES_CP.has(g)) found.push(g)
  }
  if (found.length > 0) return [...new Set(found)]

  // Priorité 3 : tokens courts isolés entre espaces/virgules qui sont des graphèmes connus
  const tokens = section.match(/\b([a-zàâéèêëîïôùûüç]{1,4})\b/gi) ?? []
  for (const t of tokens) {
    const g = t.toLowerCase()
    if (GRAPHEMES_CP.has(g) && g.length >= 2) found.push(g)
  }
  return [...new Set(found)].slice(0, 8)
}

function detectPages(section: string): string {
  const m = section.match(/p(?:p|ages?)?\s*\.?\s*(\d+)\s*(?:[-–àa]\s*(\d+))?/i)
  if (!m) return ''
  return m[2] ? `p. ${m[1]}–${m[2]}` : `p. ${m[1]}`
}

function parseProgressionFromText(text: string): ProgressionSemaine[] {
  const normalized = text.replace(/\r/g, '\n')

  // Trouver toutes les occurrences de "semaine N"
  const weekRegex = /semaine\s+(\d{1,2})/gi
  const occurrences: { numero: number; start: number }[] = []
  let m: RegExpExecArray | null
  while ((m = weekRegex.exec(normalized)) !== null) {
    const num = parseInt(m[1])
    if (num >= 1 && num <= 36) {
      occurrences.push({ numero: num, start: m.index })
    }
  }

  if (occurrences.length === 0) {
    return Array.from({ length: 36 }, (_, i) => ({
      numero: i + 1, items: [], pages: '', mots_exemple: [],
    }))
  }

  // Extraire les sections entre chaque "semaine N"
  const byWeek = new Map<number, ProgressionSemaine>()
  for (let i = 0; i < occurrences.length; i++) {
    const { numero, start } = occurrences[i]
    const end = i + 1 < occurrences.length
      ? occurrences[i + 1].start
      : Math.min(start + 600, normalized.length)
    const section = normalized.slice(start, end)

    byWeek.set(numero, {
      numero,
      items: detectGraphemes(section),
      pages: detectPages(section),
      mots_exemple: [],
    })
  }

  return Array.from({ length: 36 }, (_, i) => {
    return byWeek.get(i + 1) ?? { numero: i + 1, items: [], pages: '', mots_exemple: [] }
  })
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Fichier PDF manquant' }, { status: 400 })
    }
    if (file.size > 30 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 30 Mo)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const data = await pdfParse(buffer)

    const text = data.text ?? ''
    const textPreview = text.slice(0, 800).trim()

    const progression = parseProgressionFromText(text)
    const filledWeeks = progression.filter(s => s.items.length > 0).length

    return NextResponse.json({ progression, filledWeeks, textPreview })
  } catch (err) {
    console.error('parse-manuel-pdf error:', err)
    return NextResponse.json(
      { error: 'Impossible de lire ce PDF. Est-ce un PDF scanné (image) ? Utilisez le modèle CSV à la place.' },
      { status: 500 }
    )
  }
}
