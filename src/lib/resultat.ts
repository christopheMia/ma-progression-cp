/**
 * Pourquoi ce module existe (incident du 2026-07-27, vu en production par
 * Christophe) : quand une action serveur LEVE une erreur, Next.js efface son
 * texte en production pour ne rien laisser fuiter. Le navigateur ne reçoit
 * qu'un digest et l'enseignant lit « An error occurred in the Server Components
 * render... » à la place de « Écris le critère que tu veux observer. ».
 *
 * En local le message passe, donc le piège est invisible au développement et
 * les tests unitaires ne le voient pas non plus.
 *
 * Règle : un message destiné à l'enseignant est RENVOYÉ, jamais levé. Les
 * actions serveur enveloppent leur travail dans `resultat` et le composant lit
 * `message` au lieu d'attraper une exception.
 */

export type Resultat<T> =
  | { ok: true; valeur: T }
  | { ok: false; message: string }

const MESSAGE_PAR_DEFAUT = 'Une erreur est survenue.'

export async function resultat<T>(
  travail: () => Promise<T>,
  messageParDefaut: string = MESSAGE_PAR_DEFAUT,
): Promise<Resultat<T>> {
  try {
    return { ok: true, valeur: await travail() }
  } catch (error) {
    const message = error instanceof Error ? error.message.trim() : ''
    return { ok: false, message: message || messageParDefaut }
  }
}
