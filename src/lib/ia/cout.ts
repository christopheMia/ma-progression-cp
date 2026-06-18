// Tarif Sonnet 4.6 : 3 $/1M tokens d'entrée, 15 $/1M de sortie.
const USD_PAR_INPUT = 3 / 1_000_000
const USD_PAR_OUTPUT = 15 / 1_000_000
const USD_VERS_EUR = 0.92 // approximation ; estimation d'ordre de grandeur

/** Plafond mensuel estimé (aligné sur la carte plafonnée ~8 €). */
export const PLAFOND_EUROS = 8

export function estimerCoutEuros(inputTokens: number, outputTokens: number): number {
  const usd = inputTokens * USD_PAR_INPUT + outputTokens * USD_PAR_OUTPUT
  return usd * USD_VERS_EUR
}
