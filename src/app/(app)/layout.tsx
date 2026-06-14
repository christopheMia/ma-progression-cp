import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-800 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="font-bold text-lg">🍎 Ma Progression CP</h1>
        <div className="flex items-center gap-5">
          <a href="/planning" className="text-blue-200 hover:text-white text-sm">📅 Planning</a>
          <a href="/parametres" className="text-blue-200 hover:text-white text-sm">⚙️ Paramètres</a>
          <LogoutButton />
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  )
}
