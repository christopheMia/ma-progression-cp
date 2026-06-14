import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50/40 to-white">
      <header className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white px-6 py-4 shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <a href="/accueil" className="font-bold text-lg hover:opacity-90 transition-opacity">🍎 Ma Progression CP</a>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm">
            <a href="/accueil" className="px-3 py-1.5 rounded-lg text-white/85 hover:bg-white/15 hover:text-white transition-colors">🏠 Accueil</a>
            <a href="/planning" className="px-3 py-1.5 rounded-lg text-white/85 hover:bg-white/15 hover:text-white transition-colors">📅 Planning</a>
            <a href="/parametres" className="px-3 py-1.5 rounded-lg text-white/85 hover:bg-white/15 hover:text-white transition-colors">⚙️ Paramètres</a>
            <a href="/aide" className="px-3 py-1.5 rounded-lg text-white/85 hover:bg-white/15 hover:text-white transition-colors">❓ Aide</a>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  )
}
