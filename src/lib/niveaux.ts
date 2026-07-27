/**
 * L'échelle du LSU : quatre niveaux, partout dans l'application.
 *
 * Décision de Christophe du 27/07/2026 : le suivi quitte le binaire
 * acquis / non acquis pour l'échelle du livret officiel. Suivre directement
 * dans cette échelle évite d'inventer une règle de conversion au moment du
 * bilan, ce qui est aussi la façon de faire des éditeurs du marché.
 *
 * La base connaît ces mêmes quatre valeurs depuis la migration
 * `019_suivi_quatre_niveaux`, avec une contrainte qui les impose.
 */

export type Niveau = 'non_atteint' | 'partiellement' | 'atteint' | 'depasse'

/** Du moins au plus, dans l'ordre où le livret les présente. */
export const NIVEAUX: Niveau[] = ['non_atteint', 'partiellement', 'atteint', 'depasse']

/**
 * Ce qui s'affiche sur le bouton. Christophe a demandé des abréviations, avec
 * une légende sous le tableau : les quatre libellés complets, répétés pour 23
 * élèves et une dizaine de notions, rendraient l'écran illisible.
 */
export const ABREVIATION_NIVEAU: Record<Niveau, string> = {
  non_atteint: 'NA',
  partiellement: 'PA',
  atteint: 'A',
  depasse: 'D',
}

/** Ce que lit la légende, l'infobulle et la synthèse vocale. */
export const LIBELLE_NIVEAU: Record<Niveau, string> = {
  non_atteint: 'non atteint',
  partiellement: 'partiellement atteint',
  atteint: 'atteint',
  depasse: 'dépassé',
}

/**
 * La même règle que le trigger SQL de la migration 019
 * (`acquis = niveau in ('atteint','depasse')`). Le code qui lit encore
 * l'ancienne colonne `acquis` doit compter comme la base, sinon l'écran et le
 * livret ne diraient pas la même chose.
 */
export function estAcquis(niveau: Niveau): boolean {
  return niveau === 'atteint' || niveau === 'depasse'
}

/** Relecture de l'ancien booléen, pour les lignes écrites avant la migration. */
export function niveauDepuisAcquis(acquis: boolean | null): Niveau | null {
  if (acquis === null) return null
  return acquis ? 'atteint' : 'non_atteint'
}

export function estNiveau(valeur: unknown): valeur is Niveau {
  return typeof valeur === 'string' && (NIVEAUX as string[]).includes(valeur)
}
