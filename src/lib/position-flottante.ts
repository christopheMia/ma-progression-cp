// src/lib/position-flottante.ts
//
// Position memorisee du bouton flottant de l'assistant, deplacable a la souris.
//
// Trois pieges traites ici, en fonctions pures et testables :
//  1. Distinguer un CLIC d'un GLISSEMENT. Sans seuil, le panneau s'ouvre des
//     qu'on essaie de deplacer le bouton, et il devient impossible a bouger.
//  2. Ne jamais laisser sortir le bouton de la fenetre, sinon il est perdu.
//  3. Retomber sur la position par defaut quand rien n'est memorise ou que la
//     valeur enregistree est abimee.

export const SEUIL_GLISSEMENT_PX = 5
export const CLE_POSITION = 'assistant-position'

/** Marge minimale entre le bouton et le bord de la fenetre. */
const MARGE_PX = 8

export type Position = { x: number; y: number }

export type Fenetre = { largeur: number; hauteur: number }

export type Taille = { largeur: number; hauteur: number }

/** Au-dela du seuil, l'intention est de deplacer, pas d'ouvrir. */
export function estGlissement(depart: Position, courant: Position): boolean {
  const dx = courant.x - depart.x
  const dy = courant.y - depart.y
  return Math.hypot(dx, dy) >= SEUIL_GLISSEMENT_PX
}

/**
 * Ramene une position dans la fenetre. Si la fenetre est plus petite que le
 * bouton, on colle au bord haut/gauche plutot que de rendre une position
 * negative absurde.
 */
export function contraindre(
  position: Position,
  taille: Taille,
  fenetre: Fenetre,
): Position {
  const xMax = Math.max(MARGE_PX, fenetre.largeur - taille.largeur - MARGE_PX)
  const yMax = Math.max(MARGE_PX, fenetre.hauteur - taille.hauteur - MARGE_PX)
  return {
    x: Math.min(Math.max(position.x, MARGE_PX), xMax),
    y: Math.min(Math.max(position.y, MARGE_PX), yMax),
  }
}

export function estPosition(valeur: unknown): valeur is Position {
  if (typeof valeur !== 'object' || valeur === null) return false
  const candidate = valeur as Record<string, unknown>
  return typeof candidate.x === 'number' && Number.isFinite(candidate.x)
    && typeof candidate.y === 'number' && Number.isFinite(candidate.y)
}

/** Lit la position memorisee. Rend null si rien n'est enregistre ou si c'est abime. */
export function lirePositionMemorisee(brut: string | null): Position | null {
  if (!brut) return null
  try {
    const valeur: unknown = JSON.parse(brut)
    return estPosition(valeur) ? valeur : null
  } catch {
    return null
  }
}

/** Écart entre le logo de l'en-tête et le bouton de l'assistant. */
const ECART_LOGO_PX = 12

/**
 * Place par défaut du bouton : dans l'en-tête, juste à droite du logo, centré
 * dans la hauteur du bandeau (demande de Christophe du 17/10/2026). Mesurée sur
 * le vrai logo, dont la largeur dépend de la police et de l'écran.
 */
export function positionPresDuLogo(
  logo: { gauche: number; droite: number; haut: number; bas: number },
  bandeau: { haut: number; hauteur: number },
  taille: Taille,
): Position {
  return {
    x: Math.round(logo.droite + ECART_LOGO_PX),
    y: Math.round(bandeau.haut + (bandeau.hauteur - taille.hauteur) / 2),
  }
}

export type PlacementBulle = {
  /** `bas` : la bulle sous le bouton ; `haut` : au-dessus. */
  cote: 'haut' | 'bas'
  /** Bord gauche de la bulle, relatif au bord gauche du bouton, en px. */
  gauche: number
}

/**
 * Place la bulle d'accueil pour qu'elle reste entière dans l'écran : sous le
 * bouton quand il est dans la moitié haute (sa place dans l'en-tête), au-dessus
 * sinon, centrée sur lui mais jamais au-delà des marges. À droite du bouton,
 * comme avant, elle cachait le menu et sortait de l'écran d'un téléphone.
 */
export function placerBulle(
  bouton: Position & Taille,
  fenetre: Fenetre,
  largeurBulle: number,
): PlacementBulle {
  const centre = bouton.x + bouton.largeur / 2
  const gaucheMax = Math.max(MARGE_PX, fenetre.largeur - largeurBulle - MARGE_PX)
  const gaucheAbsolue = Math.min(Math.max(centre - largeurBulle / 2, MARGE_PX), gaucheMax)
  return {
    cote: bouton.y + bouton.hauteur / 2 < fenetre.hauteur / 2 ? 'bas' : 'haut',
    gauche: Math.round(gaucheAbsolue - bouton.x),
  }
}
