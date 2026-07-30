import { createClient } from '@/lib/supabase/server'
import { classeCourante, utilisateurCourant } from '@/lib/supabase/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HeaderNav from '@/components/HeaderNav'
import AssistantFlottant from '@/components/assistant/AssistantFlottant'
import { estZoneScolaire } from '@/lib/calendrier-officiel'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Identité et classe passent par `session.ts` : la page rendue juste après
  // demande les mêmes, et `cache` de React fait qu'elles ne partent qu'une
  // fois par requête au lieu de deux. Les deux partent ENSEMBLE : la classe
  // n'a pas besoin de l'identité (RLS s'en charge), et les enchaîner coûtait
  // un aller-retour Supabase de plus à chaque chargement dur (~150 ms).
  const [user, classe] = await Promise.all([utilisateurCourant(), classeCourante()])
  if (!user) redirect('/connexion')

  // Contexte minimal pour que l'assistant sache de quelle classe on parle.
  const supabase = await createClient()
  const { data: methodes } = classe
    ? await supabase.from('methodes').select('matiere').eq('class_id', classe.id)
    : { data: null }
  const matieres = [...new Set((methodes ?? []).map(m => m.matiere as string))]

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-300 via-purple-200 to-fuchsia-200">
      <header className="sticky top-0 z-20 bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-6 h-14 flex justify-between items-center">
          <Link href="/accueil" className="font-logo text-2xl sm:text-[1.7rem] leading-none text-white hover:opacity-90 transition-opacity">
            Ma Progression CP
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
        rentreeDate={classe?.rentree_date ?? undefined}
        zone={estZoneScolaire(classe?.zone_scolaire) ? classe.zone_scolaire : undefined}
        matieres={matieres}
      />
    </div>
  )
}
