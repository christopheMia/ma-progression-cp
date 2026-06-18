/** Traduit une erreur d'appel IA en message clair pour l'enseignant + statut HTTP. */
export function messageErreurIA(err: unknown): { message: string; status: number } {
  const text = err instanceof Error ? err.message : String(err)
  const low = text.toLowerCase()

  if (/anthropic_api_key/i.test(text)) {
    return { message: 'Service IA non configuré (clé API manquante).', status: 500 }
  }
  // Anthropic renvoie une erreur de facturation quand le crédit est épuisé.
  if (low.includes('credit balance') || low.includes('billing') || low.includes('insufficient')) {
    return { message: '⚠️ Le crédit IA est épuisé. Préviens l’administrateur pour le recharger.', status: 402 }
  }
  return { message: 'Erreur IA. Réessaie dans un instant.', status: 500 }
}
