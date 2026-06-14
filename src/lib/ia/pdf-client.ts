'use client'

/**
 * Extrait le texte d'un PDF DANS LE NAVIGATEUR (via pdfjs-dist).
 * On envoie ensuite seulement le texte (léger) à l'API → contourne la limite
 * de taille des fonctions serverless Vercel (~4,5 Mo).
 */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // Worker auto-hébergé depuis /public (copié de node_modules au build).
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const data = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data }).promise

  let texte = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const ligne = content.items
      .map(item => (typeof (item as { str?: unknown }).str === 'string' ? (item as { str: string }).str : ''))
      .join(' ')
    texte += ligne + '\n'
  }
  return texte.trim()
}
