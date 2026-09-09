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
  // dizaine d'allers-retours pendant qu'on lit simplement la page.
  //
  // Mais UNIQUEMENT quand un jeton de session existe déjà. Sans cette
  // condition, un préchargement lancé depuis la page de connexion rendait
  // l'application déconnectée, et le navigateur gardait cette version vide :
  // en arrivant sur l'accueil, on voyait « Configurer ma classe » alors que la
  // classe existe (signalé par Christophe le 29/07). Lire un cookie ne coûte
  // rien, contrairement à `getUser`.
  const aUnJeton = request.cookies.getAll()
    .some(c => c.name.startsWith('sb-') && c.name.includes('auth-token'))
  // Ne pas se fier a un seul nom d'en-tete : les journaux du 30/07 montraient
  // des rafales de cinq `getUser` (une par entree du menu) a chaque page vue,
  // preuve que les prechargements passaient a cote du court-circuit. Next fait
  // varier l'en-tete selon la version et le type de prechargement.
  const estPrechargement = request.headers.get('next-router-prefetch') === '1'
    || request.headers.has('next-router-segment-prefetch')
    || request.headers.get('purpose') === 'prefetch'
    || request.headers.get('x-purpose') === 'prefetch'
  if (estPrechargement && aUnJeton) {
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

  // `getUser` est un appel RESEAU au serveur d'authentification, paye avant meme
  // que la page ne commence a se rendre : c'est le cout fixe de chaque navigation.
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
  //
  // `api/veille` en sort aussi, et il le faut : c'est le ping quotidien de
  // Vercel qui empêche la base de s'endormir, et il arrive sans session. Sans
  // cette exclusion, le portier le renvoyait sur `/connexion` (constaté en
  // local, HTTP 307) et la base n'était jamais touchée : la protection aurait
  // existé sur le papier sans rien protéger. Bénéfice au passage, le ping ne
  // paie pas l'aller-retour `getUser`.
  matcher: ['/((?!_next/|api/veille|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|css|js|map|txt|xml|webmanifest)$).*)'],
}
