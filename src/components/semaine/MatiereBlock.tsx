import { libelleMatiereCanonique } from '@/lib/matieres'
import { contenuSemaine, type EntreeContenu } from '@/lib/contenu-semaine'

function labelMatiere(matiere: string): string {
  if (matiere === 'francais') return '📖 Français'
  if (matiere === 'maths') return '🔢 Maths'
  return `📋 ${libelleMatiereCanonique(matiere)}`
}

function accentMatiere(matiere: string): string {
  if (matiere === 'francais') return 'border-l-sky-400'
  if (matiere === 'maths') return 'border-l-emerald-400'
  return 'border-l-violet-400'
}

function LigneContenu({ entree }: { entree: EntreeContenu }) {
  return (
    <li className="flex items-baseline gap-2 text-sm leading-relaxed text-slate-800">
      {entree.domaine && (
        <span className="shrink-0 rounded-md bg-violet-50 px-1.5 py-0.5 text-xs font-semibold text-violet-700">
          {entree.domaine}
        </span>
      )}
      <span className="min-w-0">{entree.texte}</span>
    </li>
  )
}

export default function MatiereBlock({
  matiere, items, pages, motsExemple, manuel,
}: {
  matiere: string
  items: string[]
  pages?: string | null
  motsExemple?: string[] | null
  /** Nom du manuel importe, pour savoir d'ou vient le contenu de la semaine. */
  manuel?: string | null
}) {
  const isMaths = matiere === 'maths'
  const groupes = contenuSemaine(items)
  return (
    <div className={`bg-white border rounded-2xl p-5 space-y-2 shadow-sm border-l-4 ${accentMatiere(matiere)}`}>
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-bold text-gray-700">{labelMatiere(matiere)}</h2>
          {manuel && (
            <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
              📕 {manuel}
            </span>
          )}
        </div>
        {pages && <span className="text-xs text-gray-400">{pages}</span>}
      </div>
      {groupes.length > 0 ? (
        // Une puce par ligne, groupées par jour quand le document les donne
        // (retour du 17/10 : tout collé dans une phrase, illisible).
        <div className="divide-y divide-slate-100">
          {groupes.map(groupe => groupe.jour === null && groupes.length === 1 ? (
            <ul key="liste" className="space-y-1.5 py-1">
              {groupe.entrees.map((e, i) => <LigneContenu key={i} entree={e} />)}
            </ul>
          ) : (
            <div key={groupe.jour ?? 'sans-jour'} className="grid grid-cols-[4.5rem_1fr] gap-3 py-2">
              <span className="pt-0.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                {groupe.jour === null ? 'Semaine' : `Jour ${groupe.jour}`}
              </span>
              <ul className="space-y-1.5">
                {groupe.entrees.map((e, i) => <LigneContenu key={i} entree={e} />)}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">Révisions / pas de nouveauté cette semaine.</p>
      )}
      {motsExemple && motsExemple.length > 0 && (
        <p className="text-sm text-gray-500">{isMaths ? 'Exemples' : 'Mots exemples'} : {motsExemple.join(', ')}</p>
      )}
    </div>
  )
}
