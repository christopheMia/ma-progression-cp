/**
 * Squelette de chargement affiche pendant le rendu serveur d'une page.
 *
 * Retour du 20/07 : "latence lors de la navigation dans les menus". Les pages
 * sont des Server Components qui interrogent Supabase : sans fichier
 * `loading.tsx`, Next attend la fin du rendu avant de peindre quoi que ce soit,
 * et l'ecran reste FIGE sur la page precedente. L'utilisatrice croit que son
 * clic n'a pas ete pris en compte et reclique.
 *
 * Un squelette rend la navigation instantanee a l'oeil, meme si la requete dure
 * autant qu'avant. C'est le levier le plus rentable sur la latence percue.
 */
export default function Skeleton({ lignes = 3 }: { lignes?: number }) {
  return (
    <div className="space-y-4 animate-pulse" role="status" aria-label="Chargement en cours">
      <div className="h-24 rounded-2xl bg-white/60" />
      {Array.from({ length: lignes }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white/60 p-5 space-y-3">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="h-3 w-2/3 rounded bg-slate-200" />
          <div className="h-3 w-1/2 rounded bg-slate-200" />
        </div>
      ))}
      <span className="sr-only">Chargement…</span>
    </div>
  )
}
