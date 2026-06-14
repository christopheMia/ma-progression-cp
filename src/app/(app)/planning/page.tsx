import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnnualGrid from '@/components/planning/AnnualGrid'
import PrintButton from '@/components/PrintButton'

export default async function PlanningPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: classe } = await supabase.from('classes').select('*').eq('user_id', user.id).single()
  if (!classe) redirect('/setup')

  const { data: semaines } = await supabase
    .from('semaines').select('*').eq('class_id', classe.id).order('numero')

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Planning annuel</h1>
          <p className="text-gray-500 text-sm">Manuel : {classe.manuel_id} · {semaines?.length ?? 0} semaines</p>
        </div>
        <PrintButton label="🖨️ Imprimer le planning" />
      </div>
      <AnnualGrid semaines={semaines ?? []} />
    </div>
  )
}
