import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnnualGrid from '@/components/planning/AnnualGrid'

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
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Planning annuel</h1>
      <p className="text-gray-500 text-sm mb-6">Manuel : {classe.manuel_id} · {semaines?.length ?? 0} semaines</p>
      <AnnualGrid semaines={semaines ?? []} />
    </div>
  )
}
