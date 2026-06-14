import { Semaine } from '@/types'

export default function LectureBlock({ semaine }: { semaine: Semaine }) {
  return (
    <div className="bg-white border rounded-2xl p-5 space-y-2 shadow-sm border-l-4 border-l-sky-400">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-gray-700">📖 Lecture</h2>
        {semaine.manuel_pages && <span className="text-xs text-gray-400">{semaine.manuel_pages}</span>}
      </div>
      <p className="text-lg font-semibold text-blue-700">
        Graphème{semaine.graphemes.length > 1 ? 's' : ''} : {semaine.graphemes.map(g => `"${g}"`).join(' et ')}
      </p>
      {semaine.mots_exemple && semaine.mots_exemple.length > 0 && (
        <p className="text-sm text-gray-500">Mots exemples : {semaine.mots_exemple.join(', ')}</p>
      )}
    </div>
  )
}
