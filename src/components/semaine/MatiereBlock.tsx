import { LABELS_MATIERE, type MatiereMethode } from '@/lib/matieres'

export default function MatiereBlock({
  matiere, items, pages, motsExemple,
}: {
  matiere: MatiereMethode
  items: string[]
  pages?: string | null
  motsExemple?: string[] | null
}) {
  const estMaths = matiere === 'maths'
  const accent = estMaths ? 'border-l-emerald-400' : 'border-l-sky-400'
  const titre = estMaths ? '🔢 ' + LABELS_MATIERE.maths : '📖 ' + LABELS_MATIERE.francais
  const itemLabel = estMaths ? 'Notion' : 'Graphème'
  return (
    <div className={`bg-white border rounded-2xl p-5 space-y-2 shadow-sm border-l-4 ${accent}`}>
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-gray-700">{titre}</h2>
        {pages && <span className="text-xs text-gray-400">{pages}</span>}
      </div>
      {items.length > 0 ? (
        <p className="text-lg font-semibold text-violet-700">
          {itemLabel}{items.length > 1 ? 's' : ''} : {items.map(g => `"${g}"`).join(estMaths ? ', ' : ' et ')}
        </p>
      ) : (
        <p className="text-sm text-gray-400 italic">Révisions / pas de nouveauté cette semaine.</p>
      )}
      {motsExemple && motsExemple.length > 0 && (
        <p className="text-sm text-gray-500">{estMaths ? 'Exemples' : 'Mots exemples'} : {motsExemple.join(', ')}</p>
      )}
    </div>
  )
}
