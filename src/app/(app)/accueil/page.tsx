import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import ProgressBar from '@/components/ProgressBar'
import ProgressionCorrector from '@/components/ProgressionCorrector'
import { semaineEnCours, getStatus } from '@/lib/semaines'

export default async function AccueilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: classe } = await supabase.from('classes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
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
  const prenom = (classe.prenom_enseignant ?? '').trim()

  const progressionActuelle = (semaines ?? []).map(s => ({
    numero: s.numero,
    items: s.graphemes,
    pages: s.manuel_pages ?? '',
    mots_exemple: s.mots_exemple ?? [],
  }))

  return (
    <div className="space-y-8 animate-pop-in">
      {/* Bandeau d'accueil illustré */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-violet-600 to-purple-600 text-white p-6 sm:p-8 shadow-md">
        <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -right-8 -top-10 w-52 h-52 opacity-25">
          <circle cx="140" cy="60" r="60" fill="white" />
          <circle cx="60" cy="150" r="34" fill="white" opacity="0.6" />
          <circle cx="180" cy="150" r="18" fill="white" opacity="0.5" />
        </svg>
        <div className="relative z-10 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Bonjour {prenom ? `${prenom} ` : ''}👋</h1>
            <p className="text-white/80 mt-1 capitalize">{aujourdhui}</p>
          </div>
          <div className="hidden sm:block text-4xl select-none">📚🍎✏️</div>
        </div>
      </div>

      {/* Correction IA de la progression (non destructif) */}
      <div className="flex justify-end">
        <ProgressionCorrector classId={classe.id} progression={progressionActuelle} prenom={prenom || undefined} />
      </div>

      {/* Semaine en cours */}
      {courante && (
        <Link href={`/semaine/${courante.id}`}
          className="group block bg-white border border-slate-200 rounded-2xl p-5 hover:border-violet-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-violet-600">
              {getStatus(courante) === 'current' ? 'Cette semaine' : 'Prochaine semaine'}
            </span>
            <span className="text-slate-400 text-sm">Semaine {courante.numero}</span>
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-900">
            {courante.graphemes.length ? courante.graphemes.join(', ') : 'Révisions'}
          </div>
          <div className="text-sm text-slate-500 mt-1">🌍 {courante.edm_theme}</div>
          <div className="text-sm text-violet-600 font-medium mt-3 group-hover:translate-x-0.5 transition-transform">Ouvrir la fiche →</div>
        </Link>
      )}

      {/* Statistiques */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-3xl font-bold text-slate-900">{courante?.numero ?? 0}<span className="text-base font-normal text-slate-400">/{total}</span></div>
          <div className="text-sm text-slate-500 mt-1 mb-3">Semaine de l&apos;année</div>
          <ProgressBar value={courante?.numero ?? 0} max={total} color="bg-violet-500" />
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
            className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-violet-300 hover:shadow-sm transition-all">
            <div className="text-2xl">{c.emoji}</div>
            <div className="font-semibold text-slate-900 mt-1">{c.titre}</div>
            <div className="text-sm text-slate-500">{c.sous}</div>
          </Link>
        ))}
      </div>

      {/* Mes outils externes — panneau délimité */}
      <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600 text-white text-sm">🧰</span>
          <h2 className="font-semibold text-slate-800">Mes outils</h2>
          <span className="ml-auto text-xs text-slate-400">Ouvre dans un nouvel onglet ↗</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { href: 'https://gemini.google.com', emoji: '✨', titre: 'Gemini', sous: 'Assistant IA de Google', grad: 'from-sky-500 to-indigo-500' },
            { href: 'https://notebooklm.google.com', emoji: '📓', titre: 'NotebookLM', sous: 'Bloc-notes IA de Google', grad: 'from-violet-500 to-fuchsia-500' },
          ].map(o => (
            <a key={o.href} href={o.href} target="_blank" rel="noopener noreferrer"
              className="group flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-300 hover:shadow-md transition-all">
              <div className={`flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${o.grad} text-white text-xl shrink-0 shadow-sm`}>
                {o.emoji}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">{o.titre}</div>
                <div className="text-sm text-slate-500 truncate">{o.sous}</div>
              </div>
              <span className="ml-auto text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all">↗</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
