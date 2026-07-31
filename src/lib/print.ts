'use client'

/**
 * Imprime toute la page courante.
 * L'en-tête et les boutons (.no-print) sont masqués via `@media print` dans globals.css.
 */
export function imprimerPage() {
  window.print()
}

/**
 * Imprime uniquement l'élément ciblé (le cahier journal, une journée, le suivi
 * des élèves), même s'il est entouré d'autres blocs sur la page.
 *
 * POURQUOI PAS `visibility: hidden`, la version précédente : `visibility`
 * rend invisible mais NE RETIRE PAS du flux. Tout le reste de la page gardait
 * donc sa hauteur, en blanc, et la cible était posée par-dessus en position
 * absolue. Christophe l'a signalé le 31/07 : « grosse partie de page blanche,
 * du coup ça fait deux feuilles ». C'est exactement ça, et sur une page longue
 * comme la fiche de semaine, le vide dépassait la feuille.
 *
 * `display: none` retire du flux, lui. On remonte donc de la cible jusqu'au
 * `body` en masquant, à chaque étage, les frères qui ne sont pas sur le chemin.
 * La cible se retrouve seule et s'imprime au fil du papier, sans positionnement
 * absolu et sans hauteur fantôme.
 *
 * Les styles en ligne précédents sont mémorisés et restaurés : la page doit
 * revenir exactement dans son état, y compris si un composant avait posé son
 * propre `display`.
 */
export function imprimerElement(el: HTMLElement | null) {
  if (!el) return

  const restaurations: Array<() => void> = []

  let courant: HTMLElement = el
  while (courant.parentElement && courant !== document.body) {
    const parent: HTMLElement = courant.parentElement
    for (const frere of Array.from(parent.children)) {
      if (frere === courant) continue
      const bloc = frere as HTMLElement
      const avant = bloc.style.display
      bloc.style.display = 'none'
      restaurations.push(() => { bloc.style.display = avant })
    }
    courant = parent
  }

  el.classList.add('print-target')

  let nettoye = false
  const cleanup = () => {
    if (nettoye) return
    nettoye = true
    el.classList.remove('print-target')
    for (const restaurer of restaurations) restaurer()
    window.removeEventListener('afterprint', cleanup)
  }

  window.addEventListener('afterprint', cleanup)
  try {
    window.print()
  } finally {
    // Filet : si `afterprint` ne se déclenche pas (certains navigateurs, ou une
    // impression annulée), la page resterait amputée de tout son contenu. Le
    // rendre irrécupérable pour un oubli d'événement serait bien pire que le
    // problème d'origine.
    setTimeout(cleanup, 1000)
  }
}
