'use client'

import {
  grilleVersTexte,
  htmlVersTexte,
  lireChainesPartagees,
  lireFeuilleXlsx,
} from '@/lib/ia/bureautique'

/**
 * Lecture d'un fichier Word ou Excel DANS LE NAVIGATEUR.
 *
 * Les deux bibliotheques sont chargees a la demande (`await import`), comme
 * `pdf-client.ts` le fait pour pdfjs : une enseignante qui n'importe jamais de
 * fichier Excel ne telecharge jamais le lecteur Excel.
 *
 * Lire cote navigateur evite aussi la limite de 4 Mo du corps des requetes
 * Vercel : seul le texte extrait part sur le reseau, jamais le fichier.
 */

export type FormatBureautique = 'docx' | 'xlsx'

/** Formats anciens, illisibles sans outil lourd : on les nomme pour bien guider. */
const FORMATS_ANCIENS = ['.doc', '.xls', '.odt', '.ods']

export function estFormatAncien(nom: string): boolean {
  const bas = nom.toLowerCase()
  return FORMATS_ANCIENS.some(ext => bas.endsWith(ext))
}

export function formatBureautique(nom: string): FormatBureautique | null {
  const bas = nom.toLowerCase()
  if (bas.endsWith('.docx')) return 'docx'
  if (bas.endsWith('.xlsx') || bas.endsWith('.xlsm')) return 'xlsx'
  return null
}

/** Texte d'un document Word, tableaux compris. */
export async function extraireTexteDocx(fichier: File): Promise<string> {
  const mammoth = await import('mammoth/mammoth.browser')
  const { value } = await mammoth.convertToHtml({ arrayBuffer: await fichier.arrayBuffer() })
  return htmlVersTexte(value)
}

/** Texte d'un classeur Excel, une section par feuille. */
export async function extraireTexteXlsx(fichier: File): Promise<string> {
  const { unzipSync } = await import('fflate')
  const archive = unzipSync(new Uint8Array(await fichier.arrayBuffer()))
  const decodeur = new TextDecoder()
  const lire = (chemin: string) => (archive[chemin] ? decodeur.decode(archive[chemin]) : '')

  const chaines = lireChainesPartagees(lire('xl/sharedStrings.xml'))

  // Les onglets portent souvent une information utile ("P1", "Periode 2"...).
  const noms = [...lire('xl/workbook.xml').matchAll(/<sheet\b[^>]*\bname="([^"]*)"/g)]
    .map(m => m[1])

  const feuilles = Object.keys(archive)
    .filter(chemin => /^xl\/worksheets\/sheet\d+\.xml$/.test(chemin))
    .sort((a, b) => Number(a.match(/(\d+)/)![1]) - Number(b.match(/(\d+)/)![1]))

  const sections = feuilles.map((chemin, index) => {
    const texte = grilleVersTexte(lireFeuilleXlsx(lire(chemin), chaines))
    if (!texte) return ''
    const nom = noms[index]
    return nom ? `## ${nom}\n${texte}` : texte
  })

  return sections.filter(Boolean).join('\n\n')
}

/**
 * Texte d'un fichier bureautique, quel que soit son format.
 *
 * Leve une erreur explicite plutot que de rendre une chaine vide : l'appelant
 * doit pouvoir dire a l'utilisatrice ce qui ne va pas et quoi faire.
 */
export async function extraireTexteBureautique(fichier: File): Promise<string> {
  const format = formatBureautique(fichier.name)
  if (!format) {
    throw new Error(
      estFormatAncien(fichier.name)
        ? `« ${fichier.name} » est dans un format ancien. Ouvre-le, puis « Enregistrer sous » en choisissant .docx, .xlsx ou PDF.`
        : `Format non reconnu pour « ${fichier.name} ».`,
    )
  }

  const texte = format === 'docx'
    ? await extraireTexteDocx(fichier)
    : await extraireTexteXlsx(fichier)

  if (texte.trim().length < 20) {
    throw new Error(
      `« ${fichier.name} » ne contient pas de texte lisible. Si ta progression y est sous forme d'image ou de capture d'écran, exporte plutôt le document en PDF.`,
    )
  }
  return texte
}
