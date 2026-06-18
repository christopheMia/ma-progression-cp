import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HeaderNav from '@/components/HeaderNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: classe } = await supabase.from('classes').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-300 via-purple-200 to-fuchsia-200">
      <header className="sticky top-0 z-20 bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-6 h-14 flex justify-between items-center">
          <Link href={classe ? '/accueil' : '/setup'} className="font-semibold text-white hover:opacity-90 transition-opacity">
            📖✏️ Ma Progression CP
          </Link>
          <HeaderNav hasClass={!!classe} />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
