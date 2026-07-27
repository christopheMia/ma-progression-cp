const LONGUEUR_MAX_CRITERE = 180

export function normaliserLibelleCritere(libelle: unknown): string {
  if (typeof libelle !== 'string') {
    throw new Error('Le critère doit être un texte.')
  }

  const normalise = libelle.trim().replace(/\s+/g, ' ')
  if (!normalise) throw new Error('Écris le critère que tu veux observer.')
  if (normalise.length > LONGUEUR_MAX_CRITERE) {
    throw new Error(`Le critère ne peut pas dépasser ${LONGUEUR_MAX_CRITERE} caractères.`)
  }
  return normalise
}

export function cleObservation(eleveId: string, critereId: string): string {
  return `${eleveId}|${critereId}`
}

