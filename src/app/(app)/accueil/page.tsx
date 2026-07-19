import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import ProgressBar from '@/components/ProgressBar'
import ProgressionCorrector from '@/components/ProgressionCorrector'
import BudgetIaIndicator from '@/components/BudgetIaIndicator'
import { semaineEnCours, getStatus } from '@/lib/semaines'

export default async function AccueilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: classe } = await supabase.from('classes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()

  // Premiere visite (aucune classe) : on invite a configurer, sans jamais bloquer.
  // Le menu du haut (Parametres, etc.) reste accessible a tout moment.
  if (!classe) {
    return (
      <div className="animate-pop-in max-w-2xl mx-auto">
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">📖✏️</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Bienvenue sur Ma Progression CP 👋</h1>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Pour commencer, configure ta classe : ta méthode de lecture, la date de rentrée, tes élèves
            et ton emploi du temps. L&apos;IA construit ta progression de l&apos;année, tu pourras tout corriger ensuite.
          </p>
          <Link href="/setup"
            className="inline-block bg-violet-600 text-white rounded-xl px-6 py-3 font-semibold hover:bg-violet-700 transition-colors">
            ✨ Configurer ma classe
          </Link>
          <p className="text-sm text-slate-400 mt-4">
            Juste pour découvrir ? Tu peux charger une classe d&apos;exemple depuis l&apos;écran de configuration.
          </p>
        </div>
      </div>
    )
  }

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
          <div className="hidden sm:block text-4xl select-none">📚✏️</div>
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

      {/* Statistiques (cartes cliquables : chacune mène à l'endroit utile) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/planning"
          className="group block bg-white border border-slate-200 rounded-2xl p-5 hover:border-violet-300 hover:shadow-sm transition-all">
          <div className="text-3xl font-bold text-slate-900">{courante?.numero ?? 0}<span className="text-base font-normal text-slate-400">/{total}</span></div>
          <div className="text-sm text-slate-500 mt-1 mb-3">Semaine de l&apos;année <span className="text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span></div>
          <ProgressBar value={courante?.numero ?? 0} max={total} color="bg-violet-500" />
        </Link>

        <Link href={courante ? `/semaine/${courante.id}` : '/planning'}
          className="group block bg-white border border-slate-200 rounded-2xl p-5 hover:border-violet-300 hover:shadow-sm transition-all">
          <div className="text-3xl font-bold text-slate-900">{Math.round((acquisCount / (possible || 1)) * 100)}<span className="text-base font-normal text-slate-400">%</span></div>
          <div className="text-sm text-slate-500 mt-1 mb-3">Graphèmes acquis (classe) <span className="text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span></div>
          <ProgressBar value={acquisCount} max={possible} color="bg-emerald-500" />
        </Link>

        <Link href="/parametres"
          className="group block bg-white border border-slate-200 rounded-2xl p-5 hover:border-violet-300 hover:shadow-sm transition-all">
          <div className="text-3xl font-bold text-slate-900">{nbEleves}</div>
          <div className="text-sm text-slate-500 mt-1">Élève{nbEleves > 1 ? 's' : ''} dans la classe <span className="text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span></div>
        </Link>
      </div>

      {/* Invitation : ajouter les autres matières */}
      <Link href="/parametres#methodes"
        className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:border-violet-300 hover:shadow-sm transition-all">
        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-violet-100 text-violet-700 text-xl shrink-0">➕</span>
        <div className="min-w-0">
          <div className="font-semibold text-slate-900">Ajoute tes matières ici</div>
          <div className="text-sm text-slate-500">
            Maths, Anglais, Questionner le monde… pour les retrouver dans ton suivi et ton cahier journal.
          </div>
        </div>
        <span className="ml-auto text-violet-600 font-medium whitespace-nowrap group-hover:translate-x-0.5 transition-transform">Ajouter mes matières →</span>
      </Link>

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

      {/* Mes outils IA — tout est dans l'appli (plus de renvoi vers des outils externes) */}
      <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600 text-white text-sm">🧰</span>
          <h2 className="font-semibold text-slate-800">Mes outils IA</h2>
          <span className="ml-auto text-xs text-slate-400">L&apos;IA est dans l&apos;appli</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { href: courante ? `/semaine/${courante.id}` : '/planning', emoji: '📋', titre: 'Cahier journal de la semaine', sous: 'Le déroulement de ta journée, proposé par l’IA' },
            { href: '/parametres#methodes', emoji: '📚', titre: 'Mes méthodes & progression', sous: 'L’IA lit ton manuel et construit ta progression' },
            { href: '/competences', emoji: '🎯', titre: 'Compétences & livret', sous: 'Le programme officiel CP visé par ta progression' },
          ].map(o => (
            <Link key={o.href} href={o.href}
              className="group flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-300 hover:shadow-md transition-all">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-violet-100 text-violet-700 text-xl shrink-0">
                {o.emoji}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">{o.titre}</div>
                <div className="text-sm text-slate-500">{o.sous}</div>
              </div>
              <span className="ml-auto text-violet-400 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all">→</span>
            </Link>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-violet-100">
          <BudgetIaIndicator />
        </div>
      </section>
    </div>
  )
}
