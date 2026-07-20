import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HeaderNav from '@/components/HeaderNav'
import AssistantFlottant from '@/components/assistant/AssistantFlottant'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: classe } = await supabase.from('classes').select('id, prenom_enseignant').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-300 via-purple-200 to-fuchsia-200">
      <header className="sticky top-0 z-20 bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-6 h-14 flex justify-between items-center">
          <Link href="/accueil" className="font-semibold text-white hover:opacity-90 transition-opacity">
            📖✏️ Ma Progression CP
          </Link>
          <HeaderNav hasClass={!!classe} />
        </div>
      </header>
      {/* pb-28 : reserve la place du bouton flottant "Mon assistant", sinon il
          recouvre le dernier element de la page sur petit ecran. */}
      <main className="max-w-5xl mx-auto px-6 pt-8 pb-28">{children}</main>
      {/* Outil IA central : accessible depuis TOUS les ecrans (retour du 20/07). */}
      <AssistantFlottant
        hasClass={!!classe}
        prenom={(classe?.prenom_enseignant ?? '').trim() || undefined}
      />
    </div>
  )
}
