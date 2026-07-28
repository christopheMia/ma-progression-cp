/**
 * Reconnaître les notions qui se ressemblent, sans IA.
 *
 * Pourquoi : rattacher une notion de méthode à une compétence officielle se
 * fait à la main (décision de Christophe du 27/07/2026, pour économiser le
 * budget de la clé Anthropic). Mais une méthode de lecture contient quatorze
 * notions « Lire a », « Lire i », « Lire ch »... qui vont toutes sur la même
 * compétence. Les rattacher une par une est un travail bête et long.
 *
 * Cette comparaison est volontairement simple et explicable : l'enseignante
 * doit pouvoir prévoir ce que le bouton va faire. Pas de score obscur, pas
 * d'appel réseau, et le résultat lui est montré avant d'être appliqué.
 *
 * Fonctions pures, sans React ni Supabase.
 */

/** Mots outils qui ne portent pas le sens. Volontairement court. */
const MOTS_OUTILS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l',
  'au', 'aux', 'ce', 'ces', 'et', 'ou', 'en', 'dans', 'sur',
])

/**
 * Découpe en mots comparables : minuscules, sans accent, sans ponctuation.
 * Les apostrophes typographiques et droites sont traitées pareil, sinon
 * « l'étude » et « l’étude » ne se ressembleraient pas.
 */
export function motsDe(notion: string): string[] {
  return notion
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/**
 * Le premier mot porteur. En pratique une notion commence par son verbe
 * (« Lire a », « Comparer deux nombres »), et c'est le signal le plus fiable
 * pour dire que deux notions font le même geste.
 */
export function tete(notion: string): string {
  for (const mot of motsDe(notion)) {
    if (!MOTS_OUTILS.has(mot)) return mot
  }
  return ''
}

/** Part des mots communs, entre 0 et 1. */
export function similarite(a: string, b: string): number {
  const motsA = new Set(motsDe(a))
  const motsB = new Set(motsDe(b))
  if (motsA.size === 0 || motsB.size === 0) return 0

  let communs = 0
  for (const mot of motsA) if (motsB.has(mot)) communs++
  return communs / (motsA.size + motsB.size - communs)
}

/** Au-delà, deux notions se ressemblent assez sans partager leur verbe. */
const SEUIL_PAR_DEFAUT = 0.6

/**
 * Les notions qui se ressemblent, dans l'ordre reçu, la référence exclue.
 *
 * Deux notions se ressemblent si elles font le même geste (même premier mot
 * porteur), ou si elles se recouvrent largement. Un verbe différent ne suffit
 * jamais à lui seul : « Lire a » et « Écrire la lettre a » partagent un mot
 * mais ne vont pas sur la même compétence, et les confondre serait une faute.
 */
export function notionsSemblables<T extends { notion: string }>(
  reference: string,
  candidates: T[],
  seuil: number = SEUIL_PAR_DEFAUT,
): T[] {
  const teteReference = tete(reference)
  if (!teteReference) return []

  return candidates.filter(candidat => {
    if (candidat.notion.trim() === reference.trim()) return false
    if (tete(candidat.notion) === teteReference) return true
    return similarite(reference, candidat.notion) >= seuil
  })
}
