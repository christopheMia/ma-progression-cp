/**
 * Lecture des fichiers Word et Excel, partie pure et testable.
 *
 * Pourquoi ce module existe : l'API d'Anthropic n'accepte PAS les formats
 * binaires (.docx, .xlsx). Seuls le PDF et le texte passent. Mais demander a
 * une enseignante de quitter l'application, ouvrir Word, exporter en PDF et
 * revenir, c'est exactement la rupture de parcours que ce projet s'interdit.
 *
 * Bonne nouvelle : contrairement au PDF, un .docx et un .xlsx contiennent leurs
 * tableaux DEJA structures (du XML zippe, avec des balises de ligne et de
 * cellule). La ou `pdf-client.ts` doit reconstruire la geometrie a partir de
 * coordonnees, ici il n'y a rien a deviner. Le texte extrait est donc plus
 * fidele que celui d'un PDF, pas moins.
 *
 * Le format de sortie est le meme des deux cotes : des lignes « a | b | c »,
 * que le modele lit tres bien (c'est deja ce que produit l'extraction PDF).
 */

/** Separateur de cellules, aligne sur ce que produit `pdf-client.ts`. */
const SEP = ' | '

/** Decode les entites XML d'un texte de cellule. */
export function decoderEntites(texte: string): string {
  return texte
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // En dernier, sinon « &amp;lt; » deviendrait « < » au lieu de « &lt; ».
    .replace(/&amp;/g, '&')
}

/**
 * Convertit la reference de colonne d'un tableur en index (A=0, Z=25, AA=26).
 *
 * Indispensable : une cellule vide n'apparait pas du tout dans le XML. Sans
 * cette conversion, une ligne « A1, C1 » se lirait « A1, C1 » cote a cote et
 * decalerait toute la colonne, ce qui fausserait un emploi du temps entier.
 */
export function colonneVersIndex(lettres: string): number {
  let index = 0
  for (const lettre of lettres.toUpperCase()) {
    index = index * 26 + (lettre.charCodeAt(0) - 64)
  }
  return index - 1
}

/** Table des chaines partagees d'un classeur (`xl/sharedStrings.xml`). */
export function lireChainesPartagees(xml: string): string[] {
  const chaines: string[] = []
  for (const bloc of xml.match(/<si\b[^>]*>[\s\S]*?<\/si>|<si\b[^>]*\/>/g) ?? []) {
    // Une chaine peut etre coupee en plusieurs <t> quand sa mise en forme
    // change au milieu (un mot en gras suffit). On les recolle.
    const morceaux = bloc.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) ?? []
    chaines.push(morceaux
      .map(m => decoderEntites(m.replace(/<t\b[^>]*>([\s\S]*?)<\/t>/, '$1')))
      .join(''))
  }
  return chaines
}

/**
 * Transforme une feuille de calcul en grille de cellules.
 *
 * Le XML d'un tableur omet les cellules vides et n'a aucune notion de « ligne
 * complete » : on se repere uniquement sur la reference (« B3 »).
 */
export function lireFeuilleXlsx(xml: string, chainesPartagees: string[]): string[][] {
  const grille: string[][] = []

  for (const ligneXml of xml.match(/<row\b[^>]*>[\s\S]*?<\/row>/g) ?? []) {
    const numero = Number(ligneXml.match(/\br="(\d+)"/)?.[1] ?? 0)
    if (!numero) continue
    const ligne: string[] = []

    for (const celluleXml of ligneXml.match(/<c\b[^>]*>[\s\S]*?<\/c>|<c\b[^>]*\/>/g) ?? []) {
      const ref = celluleXml.match(/\br="([A-Z]+)\d+"/)?.[1]
      if (!ref) continue
      const type = celluleXml.match(/\bt="([^"]+)"/)?.[1]
      let valeur = ''

      if (type === 'inlineStr') {
        valeur = (celluleXml.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) ?? [])
          .map(m => decoderEntites(m.replace(/<t\b[^>]*>([\s\S]*?)<\/t>/, '$1')))
          .join('')
      } else {
        const brut = celluleXml.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1]
        if (brut !== undefined) {
          valeur = type === 's'
            ? (chainesPartagees[Number(brut)] ?? '')
            : decoderEntites(brut)
        }
      }

      ligne[colonneVersIndex(ref)] = valeur
    }

    grille[numero - 1] = ligne
  }

  // Les trous laisses par les lignes absentes deviennent des lignes vides.
  return Array.from(grille, ligne => Array.from(ligne ?? [], c => c ?? ''))
}

/** Met une grille au format lu par le modele, en retirant le vide inutile. */
export function grilleVersTexte(grille: string[][]): string {
  const lignes = grille
    .map(ligne => ligne.map(c => (c ?? '').replace(/\s+/g, ' ').trim()))
    // Une ligne entierement vide n'apporte rien et coute des tokens.
    .filter(ligne => ligne.some(c => c !== ''))
    .map(ligne => {
      // On coupe les cellules vides de FIN seulement : celles du milieu portent
      // une information de position (une case libre dans un emploi du temps).
      let fin = ligne.length
      while (fin > 0 && ligne[fin - 1] === '') fin--
      return ligne.slice(0, fin).join(SEP)
    })
  return lignes.join('\n')
}

/**
 * Convertit le HTML produit par la lecture d'un .docx en texte structure.
 *
 * Les tableaux sont conserves ligne par ligne : c'est toute la valeur du
 * format Word par rapport a un PDF, il ne faut surtout pas les aplatir.
 */
export function htmlVersTexte(html: string): string {
  const sortie: string[] = []
  let reste = html

  // Les tableaux d'abord, pour ne pas que le nettoyage generique les efface.
  reste = reste.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, tableau => {
    const grille = (tableau.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? []).map(ligne =>
      (ligne.match(/<t[dh]\b[^>]*>[\s\S]*?<\/t[dh]>/gi) ?? []).map(cellule =>
        decoderEntites(cellule.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()))
    return `\n@@TABLEAU@@${grilleVersTexte(grille)}@@FIN@@\n`
  })

  for (const bloc of reste.split(/<\/(?:p|h[1-6]|li|div)>/i)) {
    // Le decoupage sur la capture fait alterner les morceaux : les index
    // impairs sont les tableaux deja mis en forme, les pairs du HTML a
    // nettoyer. Un paragraphe colle juste apres un tableau reste ainsi visible.
    const morceaux = bloc.split(/@@TABLEAU@@([\s\S]*?)@@FIN@@/)
    morceaux.forEach((morceau, index) => {
      if (index % 2 === 1) {
        if (morceau) sortie.push(morceau)
        return
      }
      const texte = decoderEntites(morceau.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
      if (texte) sortie.push(texte)
    })
  }

  return sortie.join('\n').trim()
}
