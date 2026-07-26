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
