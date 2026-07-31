import Anthropic from '@anthropic-ai/sdk'

/** Modèles utilisés (un seul compte/clé ; le modèle est un paramètre de requête). */

// Import sur Sonnet 5 depuis le 31/07/2026.
//
// Ce qui se joue ici est la LECTURE, pas le raisonnement : lire un PDF, c'est
// de la vision, chaque page étant traitée comme une image. Sonnet 5 est le
// premier Sonnet à lire les images en haute résolution (2576 px sur le grand
// côté, contre 1568 avant), donc directement la finesse avec laquelle les
// tableaux de Cécile sont déchiffrés. C'est aussi pour ça qu'Opus reste écarté :
// il coûte plus cher pour améliorer un raisonnement qui n'est pas le goulot,
// et il dépasse le temps max des fonctions serverless Vercel.
export const MODELE_IMPORT = 'claude-sonnet-5'

// Le chat reste sur Sonnet 4.6 : c'est une surface interactive, où la latence
// se voit tout de suite. Rien à y gagner à changer, et un risque de lenteur.
export const MODELE_CHAT = 'claude-sonnet-4-6'

// Bilan et assistant : Haiku 4.5, trois fois moins cher (1 $/5 $ le million de
// tokens contre 3 $/15 $). Ces deux routes écrivent un paragraphe court à
// partir d'un contexte déjà mâché ; payer un Sonnet pour ça n'achète rien.
export const MODELE_COURT = 'claude-haiku-4-5'

/**
 * Réflexion étendue explicitement éteinte sur les routes d'import.
 *
 * Piège de Sonnet 5, et raison d'être de cette constante : ne PAS passer de
 * champ `thinking` n'éteint plus la réflexion, ça l'active (le défaut a changé
 * entre la 4.6 et la 5). Or `max_tokens` plafonne la réflexion ET la réponse
 * ensemble : le modèle pourrait dépenser l'essentiel du budget à réfléchir et
 * rendre un JSON coupé au milieu. Le silence n'est plus une position neutre,
 * il faut le dire.
 */
export const REFLEXION_ETEINTE = { type: 'disabled' } as const

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
