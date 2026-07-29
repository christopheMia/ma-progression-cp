import Link from 'next/link'
import type { SemainePlanning } from '@/lib/planning-annuel'
import { getStatus, type Status } from '@/lib/semaines'

const statusStyles: Record<Status, string> = {
  done: 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300',
  current: 'bg-violet-50/60 border-violet-300 ring-1 ring-violet-200 text-slate-900',
  upcoming: 'bg-white border-slate-200 text-slate-600 hover:border-violet-300',
}

export default function WeekCard({
  semaine,
}: {
  semaine: SemainePlanning
}) {
  const status = getStatus(semaine)
  const { acquis, total } = semaine.avancement
  const pct = total > 0 ? Math.min(100, Math.round((acquis / total) * 100)) : 0
  const complete = total > 0 && acquis >= total

  return (
    // `prefetch={false}` : le planning affiche 36 cartes, et Next precharge
    // par defaut celles qui sont a l'ecran. Ouvrir le planning declenchait
    // donc une dizaine de rendus COMPLETS de la fiche de semaine, la page la
    // plus lourde de l'application, tous en meme temps. La page reellement
    // cliquee attendait derriere : c'est le decalage de 1 a 2 secondes mesure
    // le 29/07. On ne precharge que ce qui a une chance d'etre ouvert.
    <Link href={`/semaine/${semaine.id}`} prefetch={false}>
      <div className={`border rounded-xl p-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${statusStyles[status]}`}>
        <div className="flex justify-between items-start mb-1">
          <span className="font-bold text-sm">S{semaine.numero}</span>
          {/* Un `title` ne se survole pas sur telephone, et ces trois marqueurs
              portent tout le sens de la carte. Le mot est ecrit pour les
              lecteurs d'ecran, sans rien changer a l'oeil. */}
          {complete && (
            <span title="Semaine complète" className="text-xs">
              <span aria-hidden>🏆</span><span className="sr-only">Semaine complète</span>
            </span>
          )}
          {!complete && status === 'done' && (
            <span className="text-emerald-500 text-xs">
              <span aria-hidden>✓</span><span className="sr-only">Semaine passée</span>
            </span>
          )}
          {!complete && status === 'current' && (
            <span className="text-violet-600 text-xs font-bold">
              <span aria-hidden>▶</span><span className="sr-only">Semaine en cours</span>
            </span>
          )}
        </div>
        <div className="space-y-1.5 min-h-[1rem]">
          {semaine.contenus.map(contenu => (
            <div key={contenu.codeMatiere} className="min-w-0">
              <div className="text-[10px] leading-tight font-semibold text-slate-700 truncate">
                <span>{contenu.libelleMatiere}</span>
                <span className="font-normal text-slate-400"> · </span>
                <span className="font-normal text-slate-400">{contenu.nomMethode}</span>
              </div>
              <div className="text-xs font-medium line-clamp-2" title={contenu.items.join(', ')}>
                {contenu.items.join(', ')}
              </div>
            </div>
          ))}
        </div>
        {total > 0 && (
          <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${complete ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </Link>
  )
}
