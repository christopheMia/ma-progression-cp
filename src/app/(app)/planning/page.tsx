import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen, CalendarDays } from 'lucide-react'
import AnnualGrid from '@/components/planning/AnnualGrid'
import PrintButton from '@/components/PrintButton'
import ProgressBar from '@/components/ProgressBar'
import ProgressionCorrector from '@/components/ProgressionCorrector'
import Bouton from '@/components/ui/Bouton'
import { codeMatiereCanonique } from '@/lib/matieres'
import { construirePlanningAnnuel } from '@/lib/planning-annuel'
import { semaineEnCours } from '@/lib/semaines'

export default async function PlanningPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: classe } = await supabase.from('classes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!classe) redirect('/setup')

  const [
    { data: semaines },
    { data: eleves },
    { data: periodes },
    { data: progression },
    { data: methodes },
  ] = await Promise.all([
    supabase.from('semaines').select('*').eq('class_id', classe.id).order('numero'),
    supabase.from('eleves').select('id').eq('class_id', classe.id),
    supabase.from('periodes')
      .select('numero, nom, date_debut, date_fin, ordre')
      .eq('class_id', classe.id).order('ordre'),
    supabase.from('progression')
      .select('numero, matiere, methode_id, items, pages, mots_exemple')
      .eq('class_id', classe.id)
      .order('numero'),
    supabase.from('methodes')
      .select('id, matiere, manuel, suivi_actif')
      .eq('class_id', classe.id)
      .order('created_at'),
  ])

  const semaineIds = (semaines ?? []).map(s => s.id)
  const acquisitions = semaineIds.length
    ? (await supabase.from('acquisitions')
        .select('semaine_id, eleve_id, matiere, grapheme')
        .eq('acquis', true)
        .in('semaine_id', semaineIds)).data ?? []
    : []

  const nomsMethodes = (methodes ?? [])
    .map(methode => methode.manuel?.trim())
    .filter((nom): nom is string => Boolean(nom))
  const methodesNom = nomsMethodes.length
    ? nomsMethodes.join(' · ')
    : 'Aucune méthode configurée'
  const courante = semaineEnCours(semaines ?? [])
  const total = semaines?.length ?? 0
  const planning = construirePlanningAnnuel(
    semaines ?? [],
    progression ?? [],
    methodes ?? [],
    acquisitions,
    eleves?.length ?? 0,
  )

  const prenom = (classe.prenom_enseignant ?? '').trim()
  const progressionActuelle = (progression ?? [])
    .filter(ligne => codeMatiereCanonique(ligne.matiere) === 'francais')
    .map(ligne => ({
      numero: ligne.numero,
      items: ligne.items,
      pages: ligne.pages ?? '',
      mots_exemple: ligne.mots_exemple ?? [],
    }))

  return (
    <div className="animate-pop-in">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Planning annuel</h1>
          <p className="text-slate-500 text-sm flex items-center gap-1.5"><BookOpen size={15} className="text-slate-400" aria-hidden="true" /> {methodesNom} · {total} semaines</p>
        </div>
        <div className="flex gap-2 items-center">
          <Bouton variant="contour" size="sm" href="/periodes">
            <CalendarDays size={16} className="relative" aria-hidden="true" />
            Vue par période
          </Bouton>
          <ProgressionCorrector classId={classe.id} progression={progressionActuelle} prenom={prenom || undefined} />
          <PrintButton label="Imprimer le planning" />
        </div>
      </div>

      {courante && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-slate-700">Avancement de l&apos;année</span>
            <span className="text-slate-500">Semaine {courante.numero} / {total}</span>
          </div>
          <ProgressBar value={courante.numero} max={total} color="bg-violet-500" />
        </div>
      )}

      <AnnualGrid
        semaines={planning}
        periodes={periodes ?? []}
        aucuneMethode={(methodes ?? []).length === 0}
      />
    </div>
  )
}
