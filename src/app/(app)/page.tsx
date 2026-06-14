import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')
  const { data: classe } = await supabase.from('classes').select('id').eq('user_id', user.id).single()
  if (!classe) redirect('/setup')
  redirect('/accueil')
}
