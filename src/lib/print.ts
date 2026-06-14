'use client'

/**
 * Imprime toute la page courante.
 * L'en-tête et les boutons (.no-print) sont masqués via `@media print` dans globals.css.
 */
export function imprimerPage() {
  window.print()
}

/**
 * Imprime uniquement l'élément ciblé (ex. le suivi des élèves ou le cahier journal),
 * même s'il est entouré d'autres blocs sur la page.
 * Technique : on masque tout via `body.print-isolated`, puis on ré-affiche la cible.
 */
export function imprimerElement(el: HTMLElement | null) {
  if (!el) return
  el.classList.add('print-target')
  document.body.classList.add('print-isolated')
  const cleanup = () => {
    el.classList.remove('print-target')
    document.body.classList.remove('print-isolated')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}
