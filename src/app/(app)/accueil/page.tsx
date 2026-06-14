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
    <div className="space-y-8 animate-pop-in">
      {/* Accueil */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bonjour 👋</h1>
        <p className="text-slate-500 mt-1 capitalize">{aujourdhui}</p>
      </div>

      {/* Semaine en cours */}
      {courante && (
        <Link href={`/semaine/${courante.id}`}
          className="group block bg-white border border-slate-200 rounded-2xl p-5 hover:border-rose-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-rose-600">
              {getStatus(courante) === 'current' ? 'Cette semaine' : 'Prochaine semaine'}
            </span>
            <span className="text-slate-400 text-sm">Semaine {courante.numero}</span>
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-900">
            {courante.graphemes.length ? courante.graphemes.join(', ') : 'Révisions'}
          </div>
          <div className="text-sm text-slate-500 mt-1">🌍 {courante.edm_theme}</div>
          <div className="text-sm text-rose-600 font-medium mt-3 group-hover:translate-x-0.5 transition-transform">Ouvrir la fiche →</div>
        </Link>
      )}

      {/* Statistiques */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-3xl font-bold text-slate-900">{courante?.numero ?? 0}<span className="text-base font-normal text-slate-400">/{total}</span></div>
          <div className="text-sm text-slate-500 mt-1 mb-3">Semaine de l&apos;année</div>
          <ProgressBar value={courante?.numero ?? 0} max={total} color="bg-rose-500" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-3xl font-bold text-slate-900">{Math.round((acquisCount / (possible || 1)) * 100)}<span className="text-base font-normal text-slate-400">%</span></div>
          <div className="text-sm text-slate-500 mt-1 mb-3">Graphèmes acquis (classe)</div>
          <ProgressBar value={acquisCount} max={possible} color="bg-emerald-500" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-3xl font-bold text-slate-900">{nbEleves}</div>
          <div className="text-sm text-slate-500 mt-1">Élève{nbEleves > 1 ? 's' : ''} dans la classe</div>
        </div>
      </div>

      {/* Raccourcis */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: '/planning', emoji: '📅', titre: 'Planning annuel', sous: 'Voir les 36 semaines' },
          { href: '/parametres', emoji: '⚙️', titre: 'Paramètres', sous: 'Élèves, emploi du temps…' },
          { href: '/aide', emoji: '❓', titre: 'Aide', sous: "Mode d'emploi" },
        ].map(c => (
          <Link key={c.href} href={c.href}
            className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-rose-300 hover:shadow-sm transition-all">
            <div className="text-2xl">{c.emoji}</div>
            <div className="font-semibold text-slate-900 mt-1">{c.titre}</div>
            <div className="text-sm text-slate-500">{c.sous}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
