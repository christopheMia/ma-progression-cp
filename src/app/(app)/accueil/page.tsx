import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import ProgressBar from '@/components/ProgressBar'
import ProgressionCorrector from '@/components/ProgressionCorrector'
import BudgetIaIndicator from '@/components/BudgetIaIndicator'
import CahierJournalCard from '@/components/accueil/CahierJournalCard'
import OutilsIaSection from '@/components/accueil/OutilsIaSection'
import { semaineEnCours, getStatus } from '@/lib/semaines'
import {
  BookOpenText, Pencil, Hand, Sparkles, Globe, ArrowRight,
  CalendarDays, Clock, Plus, Compass, BookOpen, Users,
} from 'lucide-react'
import Bouton from '@/components/ui/Bouton'

export default async function AccueilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: classe } = await supabase.from('classes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()

  // Premiere visite (aucune classe) : on invite a configurer, sans jamais bloquer.
  // Le menu du haut (Parametres, etc.) reste accessible a tout moment.
  if (!classe) {
    const apercu = [
      { icon: BookOpen, titre: 'Ta progression', sous: 'L’IA lit ton manuel et bâtit ta progression de l’année, semaine par semaine.' },
      { icon: Clock, titre: 'Ton emploi du temps', sous: 'Généré selon les volumes horaires officiels du cycle 2, puis ajustable.' },
      { icon: Users, titre: 'Le suivi de tes élèves', sous: 'Graphèmes acquis, bilans et cahier journal, au quotidien.' },
    ]
    return (
      <div className="animate-pop-in max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center shadow-sm">
          <div className="flex justify-center items-center gap-2 text-violet-500 mb-3">
            <BookOpenText size={38} aria-hidden="true" />
            <Pencil size={30} aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
            Bienvenue sur Ma Progression CP
            <Hand size={22} className="text-amber-500" aria-hidden="true" />
          </h1>
          <p className="text-slate-600 mb-6 leading-relaxed max-w-xl mx-auto">
            Pour commencer, configure ta classe : ta méthode de lecture, la date de rentrée, tes élèves
            et ton emploi du temps. L&apos;IA construit ta progression de l&apos;année, tu pourras tout corriger ensuite.
          </p>
          <Bouton variant="principal" size="lg" href="/setup">
            <Sparkles size={18} className="relative" aria-hidden="true" />
            Configurer ma classe
          </Bouton>
          <p className="text-sm text-slate-400 mt-4">
            Juste pour découvrir ? Tu peux charger une classe d&apos;exemple depuis l&apos;écran de configuration.
          </p>
        </div>

        {/* Apercu de ce que fait l'app : memes cartes, meme effet de survol que
            le reste de l'accueil (surelevation + barre d'accent). */}
        <div className="grid gap-4 sm:grid-cols-3">
          {apercu.map(a => {
            const Icone = a.icon
            return (
              <Link key={a.titre} href="/setup"
                className="carte-i group flex flex-col bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-violet-100 text-violet-700 transition-transform duration-200 group-hover:-translate-y-0.5">
                  <Icone size={22} aria-hidden="true" />
                </div>
                <div className="font-semibold text-slate-900 mt-3">{a.titre}</div>
                <div className="text-sm text-slate-500 mt-0.5">{a.sous}</div>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  // Ces deux requetes sont independantes : les enchainer doublait inutilement le
  // temps d'attente a chaque affichage de l'accueil (retour "latence" du 20/07).
  const [{ data: semaines }, { count: nbElevesCount }, { data: methodes }] = await Promise.all([
    supabase.from('semaines').select('*').eq('class_id', classe.id).order('numero'),
    supabase.from('eleves').select('id', { count: 'exact', head: true }).eq('class_id', classe.id),
    supabase.from('methodes').select('matiere, manuel').eq('class_id', classe.id).order('created_at'),
  ])

  // Noms des manuels importes, affiches sur la carte "Mes méthodes" : sans eux
  // l'enseignante ne sait pas d'ou vient sa progression (retour du 20/07).
  const nomsManuels = (methodes ?? [])
    .map(m => (m.manuel as string | null)?.trim())
    .filter((n): n is string => !!n)

  // On ne veut qu'un NOMBRE : `head: true` renvoie le compte sans rapatrier les
  // lignes, alors qu'on chargeait auparavant toutes les acquisitions de l'annee.
  const semaineIds = (semaines ?? []).map(s => s.id)
  const { count: acquisBrut } = semaineIds.length
    ? await supabase.from('acquisitions')
        .select('id', { count: 'exact', head: true })
        .eq('acquis', true).in('semaine_id', semaineIds)
    : { count: 0 }

  const total = semaines?.length ?? 0
  const nbEleves = nbElevesCount ?? 0
  const courante = semaineEnCours(semaines ?? [])
  const totalGraphemes = (semaines ?? []).reduce((n, s) => n + s.graphemes.length, 0)
  const possible = totalGraphemes * nbEleves
  const acquisCount = acquisBrut ?? 0
  const aujourdhui = format(new Date(), 'EEEE d MMMM', { locale: fr })
  const prenom = (classe.prenom_enseignant ?? '').trim()

  // Carte "Cahier journal en cours" : la semaine courante + les suivantes, pour
  // pouvoir preparer a l'avance sans repasser par le planning annuel.
  const libelle = (s: { graphemes: string[] }) =>
    s.graphemes.length ? s.graphemes.join(', ') : 'Révisions'
  const couranteLien = courante
    ? { id: courante.id, numero: courante.numero, libelle: libelle(courante) }
    : null
  const suivantes = (semaines ?? [])
    .filter(s => courante && s.numero > courante.numero)
    .slice(0, 5)
    .map(s => ({ id: s.id, numero: s.numero, libelle: libelle(s) }))

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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              Bonjour{prenom ? ` ${prenom}` : ''}
              <Hand size={26} className="text-amber-200" aria-hidden="true" />
            </h1>
            <p className="text-white/80 mt-1 capitalize">{aujourdhui}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-white/90 select-none">
            <BookOpenText size={34} aria-hidden="true" />
            <Pencil size={26} aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Correction IA de la progression (non destructif) */}
      <div className="flex justify-end">
        <ProgressionCorrector classId={classe.id} progression={progressionActuelle} prenom={prenom || undefined} />
      </div>

      {/* Semaine en cours */}
      {courante && (
        <Link href={`/semaine/${courante.id}`}
          className="carte-i group block bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-violet-600">
              {getStatus(courante) === 'current' ? 'Cette semaine' : 'Prochaine semaine'}
            </span>
            <span className="text-slate-400 text-sm">Semaine {courante.numero}</span>
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-900">
            {courante.graphemes.length ? courante.graphemes.join(', ') : 'Révisions'}
          </div>
          <div className="text-sm text-slate-500 mt-1 flex items-center gap-1.5"><Globe size={15} className="text-slate-400" aria-hidden="true" /> {courante.edm_theme}</div>
          <div className="text-sm text-violet-600 font-medium mt-3 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">Ouvrir la fiche <ArrowRight size={15} aria-hidden="true" /></div>
        </Link>
      )}

      {/* Statistiques (cartes cliquables : chacune mène à l'endroit utile) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/planning"
          className="carte-i group block bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-3xl font-bold text-slate-900">{courante?.numero ?? 0}<span className="text-base font-normal text-slate-400">/{total}</span></div>
          <div className="text-sm text-slate-500 mt-1 mb-3 flex items-center gap-1">Semaine de l&apos;année <ArrowRight size={14} className="text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" /></div>
          <ProgressBar value={courante?.numero ?? 0} max={total} color="bg-violet-500" />
        </Link>

        <Link href={courante ? `/semaine/${courante.id}` : '/planning'}
          className="carte-i group block bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-3xl font-bold text-slate-900">{Math.round((acquisCount / (possible || 1)) * 100)}<span className="text-base font-normal text-slate-400">%</span></div>
          <div className="text-sm text-slate-500 mt-1 mb-3 flex items-center gap-1">Graphèmes acquis (classe) <ArrowRight size={14} className="text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" /></div>
          <ProgressBar value={acquisCount} max={possible} color="bg-emerald-500" />
        </Link>

        <Link href="/parametres"
          className="carte-i group block bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-3xl font-bold text-slate-900">{nbEleves}</div>
          <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">Élève{nbEleves > 1 ? 's' : ''} dans la classe <ArrowRight size={14} className="text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" /></div>
        </Link>
      </div>

      {/* Raccourcis : toutes les cartes ont la MEME taille (grille reguliere).
          Parametres et Aide ne sont plus ici : ils sont deja dans le menu du
          haut, ou ils portent desormais une bulle explicative au survol. */}
      <div className="grid gap-3 sm:grid-cols-3 [&>*]:h-full">
        <Link href="/planning"
          className="carte-i group flex flex-col bg-white border border-slate-200 rounded-2xl p-5">
          <CalendarDays size={26} className="text-violet-600 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
          <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1">Planning annuel<ArrowRight size={15} className="text-violet-500 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" /></div>
          <div className="text-sm text-slate-500">Voir les {total || 36} semaines</div>
        </Link>

        <CahierJournalCard courante={couranteLien} suivantes={suivantes} />

        <Link href="/parametres#edt"
          className="carte-i group flex flex-col bg-white border border-slate-200 rounded-2xl p-5">
          <Clock size={26} className="text-violet-600 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
          <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1">Emploi du temps<ArrowRight size={15} className="text-violet-500 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" /></div>
          <div className="text-sm text-slate-500">Tes journées, créneau par créneau</div>
        </Link>

        <Link href="/parametres#methodes"
          className="carte-i group flex flex-col bg-white border border-slate-200 rounded-2xl p-5">
          <Plus size={26} className="text-violet-600 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
          <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1">Ajoute tes matières<ArrowRight size={15} className="text-violet-500 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" /></div>
          <div className="text-sm text-slate-500">Maths, Anglais, Questionner le monde…</div>
        </Link>

        <Link href="/setup"
          className="carte-i group flex flex-col bg-white border border-slate-200 rounded-2xl p-5">
          <Compass size={26} className="text-violet-600 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
          <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1">Configuration initiale<ArrowRight size={15} className="text-violet-500 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" /></div>
          <div className="text-sm text-slate-500">Méthode, rentrée, élèves, emploi du temps</div>
        </Link>
      </div>

      {/* Mes outils IA — tout est dans l'appli (plus de renvoi vers des outils externes) */}
      <OutilsIaSection
        outils={[
          { href: courante ? `/semaine/${courante.id}` : '/planning', icon: 'ClipboardList', titre: 'Cahier journal de la semaine', sous: 'Le déroulement de ta journée, proposé par l’IA' },
          { href: '/parametres#methodes', icon: 'BookOpen', titre: 'Mes méthodes & progression',
            sous: nomsManuels.length
              ? nomsManuels.join(' · ')
              : 'L’IA lit ton manuel et construit ta progression' },
          { href: '/competences', icon: 'Target', titre: 'Compétences & livret', sous: 'Le programme officiel CP visé par ta progression' },
          { href: '/programme', icon: 'Puzzle', titre: 'Programme couvert', sous: 'L’IA relie tes notions aux compétences officielles, par période' },
        ]}>
        <BudgetIaIndicator />
      </OutilsIaSection>
    </div>
  )
}
