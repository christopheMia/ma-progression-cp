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

/**
 * Une réponse coupée n'est PAS une erreur : l'appel réussit (HTTP 200).
 *
 * `max_tokens` plafonne tout ce que le modèle produit, réflexion comprise, et
 * le modèle ne voit pas ce plafond : il ne se rationne donc pas. Quand il le
 * heurte, la phrase s'arrête au milieu. Sur les routes d'import, ce milieu de
 * phrase est un JSON tronqué : sans ce garde-fou, `JSON.parse` lève une
 * SyntaxError que `messageErreurIA` traduit en « Erreur IA, réessaie », ce qui
 * est faux et envoie l'enseignante réessayer à l'identique (et repayer) au
 * lieu de raccourcir son document.
 *
 * `refusal` est traité ici pour la même raison : statut 200, contenu vide ou
 * partiel, donc mêmes dégâts au parsing. Le cas est improbable sur des
 * documents de CP, mais il coûte deux lignes à couvrir.
 *
 * Renvoie `null` quand la réponse est complète : appeler après avoir
 * enregistré la consommation, car les tokens produits sont facturés même
 * tronqués.
 */
export function messageReponseIncomplete(
  stopReason: string | null | undefined,
  conseil = 'Réessaie avec un document plus court, ou page par page.'
): { message: string; status: number } | null {
  if (stopReason === 'max_tokens') {
    return { message: `La réponse de l'IA a été coupée avant la fin. ${conseil}`, status: 422 }
  }
  if (stopReason === 'refusal') {
    return { message: "L'IA n'a pas pu traiter ce contenu. Réessaie avec un autre document.", status: 422 }
  }
  return null
}
