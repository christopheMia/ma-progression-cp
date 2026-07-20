'use client'

/**
 * Extraction du texte d'un PDF DANS LE NAVIGATEUR (via pdfjs-dist).
 *
 * IMPORTANT : on ne se contente PAS de concatener les fragments. pdf.js rend
 * les items dans l'ordre du flux de dessin, sans notion de ligne ni de colonne.
 * Un simple join(' ') transforme un tableau "Semaine x Jour x seances" en une
 * bouillie de mots, et l'IA ne peut alors plus etre fidele (retour du 20/07 :
 * "l'IA ne lit pas correctement les tableaux PDF").
 *
 * On reconstruit donc la geometrie :
 *  - regroupement des fragments par ligne (coordonnee y, avec tolerance),
 *  - tri par x dans chaque ligne,
 *  - insertion d'un separateur de colonne " | " quand l'ecart horizontal entre
 *    deux fragments est large (= saut de cellule, pas une espace de mot).
 * Le resultat ressemble a un tableau Markdown, format que le modele lit tres bien.
 */

/** Ecart vertical (en points PDF) en dessous duquel deux fragments sont sur la meme ligne. */
const TOLERANCE_LIGNE = 3
/** Ecart horizontal (en points PDF) au-dela duquel on considere un changement de cellule. */
const SEUIL_COLONNE = 14

type FragmentPdf = { str: string; transform: number[]; width: number }

type Fragment = { x: number; fin: number; texte: string }

/** Assemble les fragments d'une meme ligne en respectant les sauts de colonne. */
export function assemblerLigne(fragments: Fragment[]): string {
  const tries = [...fragments].sort((a, b) => a.x - b.x)
  let ligne = ''
  let finPrecedente: number | null = null

  for (const f of tries) {
    if (finPrecedente === null) {
      ligne = f.texte
    } else if (f.x - finPrecedente > SEUIL_COLONNE) {
      ligne += ` | ${f.texte}`
    } else if (f.x - finPrecedente > 0.5 && !ligne.endsWith(' ')) {
      ligne += ` ${f.texte}`
    } else {
      ligne += f.texte
    }
    finPrecedente = f.fin
  }
  return ligne.replace(/\s+/g, ' ').trim()
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // Worker auto-hébergé depuis /public (copié de node_modules au build).
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const data = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data }).promise

  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()

    // Regroupement par ligne : la cle est le y arrondi a la tolerance pres.
    const lignes = new Map<number, Fragment[]>()
    for (const brut of content.items) {
      const item = brut as Partial<FragmentPdf>
      if (typeof item.str !== 'string' || !item.str.trim()) continue
      if (!Array.isArray(item.transform)) continue

      const x = item.transform[4]
      const y = item.transform[5]
      const cle = Math.round(y / TOLERANCE_LIGNE)
      const fragment: Fragment = {
        x,
        fin: x + (typeof item.width === 'number' ? item.width : 0),
        texte: item.str,
      }
      const existant = lignes.get(cle)
      if (existant) existant.push(fragment)
      else lignes.set(cle, [fragment])
    }

    // Dans un PDF l'origine est en BAS a gauche : y decroissant = lecture de haut en bas.
    const texte = [...lignes.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, fragments]) => assemblerLigne(fragments))
      .filter(Boolean)
      .join('\n')

    if (texte) pages.push(`--- page ${i} ---\n${texte}`)
  }

  return pages.join('\n\n').trim()
}
