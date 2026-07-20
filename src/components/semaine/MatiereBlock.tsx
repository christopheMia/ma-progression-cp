function labelMatiere(matiere: string): string {
  if (matiere === 'francais') return '📖 Français'
  if (matiere === 'maths') return '🔢 Maths'
  return '📋 ' + matiere.charAt(0).toUpperCase() + matiere.slice(1)
}

function accentMatiere(matiere: string): string {
  if (matiere === 'francais') return 'border-l-sky-400'
  if (matiere === 'maths') return 'border-l-emerald-400'
  return 'border-l-violet-400'
}

function itemLabel(matiere: string): string {
  if (matiere === 'francais') return 'Graphème'
  if (matiere === 'maths') return 'Notion'
  return 'Élément'
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
      {items.length > 0 ? (
        <p className="text-lg font-semibold text-violet-700">
          {itemLabel(matiere)}{items.length > 1 ? 's' : ''} : {items.map(g => `"${g}"`).join(isMaths ? ', ' : ' et ')}
        </p>
      ) : (
        <p className="text-sm text-gray-400 italic">Révisions / pas de nouveauté cette semaine.</p>
      )}
      {motsExemple && motsExemple.length > 0 && (
        <p className="text-sm text-gray-500">{isMaths ? 'Exemples' : 'Mots exemples'} : {motsExemple.join(', ')}</p>
      )}
    </div>
  )
}
