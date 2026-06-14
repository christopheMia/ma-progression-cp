import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnnualGrid from '@/components/planning/AnnualGrid'
import PrintButton from '@/components/PrintButton'
import ProgressBar from '@/components/ProgressBar'
import { MANUELS } from '@/data/manuels'
import { semaineEnCours } from '@/lib/semaines'

export default async function PlanningPage() {
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
    ? await supabase.from('acquisitions').select('semaine_id').eq('acquis', true).in('semaine_id', semaineIds)
    : { data: [] }

  const acquisParSemaine: Record<string, number> = {}
  for (const a of acquis ?? []) {
    acquisParSemaine[a.semaine_id] = (acquisParSemaine[a.semaine_id] ?? 0) + 1
  }

  const manuelNom = MANUELS.find(m => m.id === classe.manuel_id)?.nom
    ?? (classe.manuel_id === 'custom' ? 'Manuel importé' : classe.manuel_id)
  const courante = semaineEnCours(semaines ?? [])
  const total = semaines?.length ?? 0

  return (
    <div className="animate-pop-in">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Planning annuel</h1>
          <p className="text-slate-500 text-sm">📖 {manuelNom} · {total} semaines</p>
        </div>
        <PrintButton label="🖨️ Imprimer le planning" />
      </div>

      {courante && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-slate-700">Avancement de l&apos;année</span>
            <span className="text-slate-500">Semaine {courante.numero} / {total}</span>
          </div>
          <ProgressBar value={courante.numero} max={total} color="bg-indigo-500" />
        </div>
      )}

      <AnnualGrid
        semaines={semaines ?? []}
        acquisParSemaine={acquisParSemaine}
        elevesCount={eleves?.length ?? 0}
      />
    </div>
  )
}
