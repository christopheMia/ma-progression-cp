import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HeaderNav from '@/components/HeaderNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: classe } = await supabase.from('classes').select('id').eq('user_id', user.id).single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 via-pink-50 to-fuchsia-50">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-rose-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex justify-between items-center">
          <Link href={classe ? '/accueil' : '/setup'} className="font-semibold text-slate-900 hover:opacity-80 transition-opacity">
            🍎 Ma Progression CP
          </Link>
          <HeaderNav hasClass={!!classe} />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
