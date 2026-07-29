/**
 * Chronomètre les chargements de page, côté serveur.
 *
 * Posé le 29/07/2026 : Christophe mesure « un décalage de 1 à 2 secondes »
 * entre le clic et la page, et je ne pouvais que supposer d'où il venait.
 * Les pages authentifiées ne sont pas mesurables de l'extérieur (il faut une
 * session), donc elles se mesurent de l'intérieur.
 *
 * Chaque ligne part dans les journaux Vercel, lisibles avec
 * `npx vercel logs <deploiement> --json`. Aucune donnée d'élève n'y figure :
 * un nom d'étape et un nombre de millisecondes, rien d'autre.
 */
/**
 * Chronomètre chaque requête d'un lot lancé en parallèle.
 *
 * Un `Promise.all` ne dit que la durée de la plus lente. Quand un lot de six
 * requêtes sur des tables minuscules met 913 ms, il faut savoir laquelle
 * traîne, et si les autres ont vraiment démarré en même temps.
 */
export function chronometrer<T>(etape: string, promesse: PromiseLike<T>): Promise<T> {
  const depart = Date.now()
  return Promise.resolve(promesse).then(
    valeur => { console.log(`[perf]   ${etape} ${Date.now() - depart}ms`); return valeur },
    erreur => { console.log(`[perf]   ${etape} ${Date.now() - depart}ms (echec)`); throw erreur },
  )
}

export async function mesurer<T>(etape: string, travail: () => Promise<T>): Promise<T> {
  const depart = Date.now()
  try {
    return await travail()
  } finally {
    console.log(`[perf] ${etape} ${Date.now() - depart}ms`)
  }
}
