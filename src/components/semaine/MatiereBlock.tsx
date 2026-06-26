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
  matiere, items, pages, motsExemple,
}: {
  matiere: string
  items: string[]
  pages?: string | null
  motsExemple?: string[] | null
}) {
  const isMaths = matiere === 'maths'
  return (
    <div className={`bg-white border rounded-2xl p-5 space-y-2 shadow-sm border-l-4 ${accentMatiere(matiere)}`}>
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-gray-700">{labelMatiere(matiere)}</h2>
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
