// src/lib/lsu-bareme.ts
//
// Barème LSU : convertit une note d'évaluation (bonnes réponses / total) en un
// des 4 niveaux du livret, selon la règle de Christophe (20/07/2026) :
//  - échelle divisée par 3 si on N'utilise PAS "dépassé" (Non atteint /
//    Partiellement atteint / Atteint),
//  - divisée par 4 si "dépassé" est un niveau à part entière,
//  - option "dépassé seulement si tout est juste" (100 %).
// Le résultat coche la bonne case ; l'enseignant peut toujours le modifier ensuite.

export type NiveauLSU = 'non_atteint' | 'partiellement' | 'atteint' | 'depasse'

export const LIBELLE_NIVEAU: Record<NiveauLSU, string> = {
  non_atteint: 'Non atteint',
  partiellement: 'Partiellement atteint',
  atteint: 'Atteint',
  depasse: 'Dépassé',
}

export type ReglesLSU = {
  /** true = "dépassé" fait partie des niveaux (échelle /4) ; false = échelle /3. */
  utiliseDepasse: boolean
  /** true = "dépassé" uniquement si 100 % de réussite (sinon barème /3 pour le reste). */
  depasseSiParfait: boolean
}

/**
 * Convertit une note (num bonnes réponses sur den) en niveau LSU.
 * Renvoie null si la note est invalide (den<=0, num<0, num>den).
 */
export function niveauDepuisScore(num: number, den: number, regles: ReglesLSU): NiveauLSU | null {
  if (!Number.isFinite(num) || !Number.isFinite(den)) return null
  if (den <= 0 || num < 0 || num > den) return null
  const r = num / den
  const parfait = num === den

  // Barème à 3 bandes (Non atteint / Partiellement / Atteint).
  const troisBandes = (): NiveauLSU => {
    if (r < 1 / 3) return 'non_atteint'
    if (r < 2 / 3) return 'partiellement'
    return 'atteint'
  }

  if (!regles.utiliseDepasse) return troisBandes()

  if (regles.depasseSiParfait) {
    return parfait ? 'depasse' : troisBandes()
  }

  // "Dépassé" comme niveau normal : 4 bandes égales.
  if (r < 1 / 4) return 'non_atteint'
  if (r < 2 / 4) return 'partiellement'
  if (r < 3 / 4) return 'atteint'
  return 'depasse'
}
