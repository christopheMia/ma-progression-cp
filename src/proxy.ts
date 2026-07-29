import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Le portier de l'application : il redirige vers `/connexion` qui n'est pas
 * connecté, et rafraîchit les jetons au passage.
 *
 * Attention, `supabase.auth.getUser()` n'est PAS une vérification locale : il
 * appelle le serveur d'authentification de Supabase à chaque fois. Ce fichier
 * s'exécute donc au prix d'un aller-retour réseau par requête interceptée,
 * d'où les deux garde-fous ci-dessous (mesuré le 29/07/2026, « la navigation
 * menu est encore lente »).
 */
export async function proxy(request: NextRequest) {
  // Next.js précharge les liens visibles : les cinq entrées du menu et chaque
  // carte de l'accueil déclenchent une requête de préchargement. Sans ce
  // court-circuit, chacune payait sa propre vérification d'identité, donc une
  // dizaine d'allers-retours pendant qu'on lit simplement la page. Le
  // préchargement rend quand même la page : le layout, lui, vérifie
  // l'identité, donc rien ne fuit.
  if (request.headers.get('next-router-prefetch') === '1') {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/connexion') || pathname.startsWith('/inscription')

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/connexion', request.url))
  }
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/accueil', request.url))
  }

  return response
}

export const config = {
  // Tout `_next`, et tout ce qui porte une extension de fichier, sortent du
  // filet. Avant, une police, un logo ou une image de `public/` déclenchaient
  // chacun leur propre appel au serveur d'authentification, alors qu'aucun
  // d'eux n'est protégé.
  matcher: ['/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|css|js|map|txt|xml|webmanifest)$).*)'],
}
