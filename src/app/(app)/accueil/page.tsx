import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import ProgressBar from '@/components/ProgressBar'
import { semaineEnCours, getStatus } from '@/lib/semaines'

export default async function AccueilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: classe } = await supabase.from('classes').select('*').eq('user_id', user.id).single()
  if (!classe) redirect('/setup')

  const { data: semaines } = await supabase
    .from('semaines').select('*').eq('class_id', classe.id).order('numero')
  const { data: eleves } = await supabase.from('eleves').select('id').eq('class_id', classe.id)

  const semaineIds = (semaines ?? []).map(s => s.id)
  const { data: acquis } = semaineIds.length
    ? await supabase.from('acquisitions').select('id').eq('acquis', true).in('semaine_id', semaineIds)
    : { data: [] }

  const total = semaines?.length ?? 0
  const nbEleves = eleves?.length ?? 0
  const courante = semaineEnCours(semaines ?? [])
  const totalGraphemes = (semaines ?? []).reduce((n, s) => n + s.graphemes.length, 0)
  const possible = totalGraphemes * nbEleves
  const acquisCount = acquis?.length ?? 0
  const aujourdhui = format(new Date(), 'EEEE d MMMM', { locale: fr })

  return (
    <div className="space-y-6 animate-pop-in">
      {/* Bandeau d'accueil */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md">
        <h1 className="text-2xl font-bold">Bonjour ! 👋</h1>
        <p className="text-white/85 capitalize">{aujourdhui}</p>
      </div>

      {/* Semaine en cours */}
      {courante && (
        <Link href={`/semaine/${courante.id}`}
          className="block bg-white border-2 border-amber-300 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              {getStatus(courante) === 'current' ? '▶ Cette semaine' : '📌 Prochaine semaine'}
            </span>
            <span className="text-gray-400 text-sm">Semaine {courante.numero}</span>
          </div>
          <div className="mt-2 text-lg font-bold text-gray-800">
            {courante.graphemes.length ? courante.graphemes.join(', ') : 'Révisions'}
          </div>
          <div className="text-sm text-gray-500 mt-1">🌍 {courante.edm_theme}</div>
          <div className="text-sm text-amber-700 font-medium mt-3">Ouvrir la fiche →</div>
        </Link>
      )}

      {/* Statistiques */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <div className="text-3xl font-bold text-violet-600">{courante?.numero ?? 0}<span className="text-base text-gray-400">/{total}</span></div>
          <div className="text-sm text-gray-500 mt-1 mb-3">Semaine de l&apos;année</div>
          <ProgressBar value={courante?.numero ?? 0} max={total} color="bg-violet-500" />
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <div className="text-3xl font-bold text-emerald-600">{Math.round((acquisCount / (possible || 1)) * 100)}<span className="text-base text-gray-400">%</span></div>
          <div className="text-sm text-gray-500 mt-1 mb-3">Graphèmes acquis (classe)</div>
          <ProgressBar value={acquisCount} max={possible} color="bg-emerald-500" />
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="text-3xl font-bold text-rose-500">{nbEleves}</div>
          <div className="text-sm text-gray-500 mt-1">Élève{nbEleves > 1 ? 's' : ''} dans la classe</div>
        </div>
      </div>

      {/* Raccourcis */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/planning" className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="text-2xl">📅</div>
          <div className="font-semibold text-gray-800 mt-1">Planning annuel</div>
          <div className="text-sm text-gray-500">Voir les 36 semaines</div>
        </Link>
        <Link href="/parametres" className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="text-2xl">⚙️</div>
          <div className="font-semibold text-gray-800 mt-1">Paramètres</div>
          <div className="text-sm text-gray-500">Élèves, emploi du temps…</div>
        </Link>
        <Link href="/aide" className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="text-2xl">❓</div>
          <div className="font-semibold text-gray-800 mt-1">Aide</div>
          <div className="text-sm text-gray-500">Mode d&apos;emploi</div>
        </Link>
      </div>
    </div>
  )
}
