import Anthropic from '@anthropic-ai/sdk'

/** Modèles utilisés (un seul compte/clé ; le modèle est un paramètre de requête). */
// Import sur Sonnet (et non Opus) : Opus dépasse le temps max des fonctions
// serverless Vercel (≈10 s sur plan gratuit). Sonnet est rapide et très bon
// pour lire un sommaire. Repasser à 'claude-opus-4-8' si plan Vercel supérieur.
export const MODELE_IMPORT = 'claude-sonnet-4-6'
export const MODELE_CHAT = 'claude-sonnet-4-6'

/** Crée un client Anthropic côté serveur. La clé NE doit JAMAIS être exposée au navigateur. */
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY manquante : ajoutez-la dans .env.local (local) et sur Vercel (prod)."
    )
  }
  return new Anthropic({ apiKey })
}
