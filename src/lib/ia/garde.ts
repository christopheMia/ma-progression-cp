import { NextResponse } from 'next/server'
import { utilisateurCourant } from '@/lib/supabase/session'

/**
 * Refuse l'appel IA si personne n'est connecte.
 *
 * Le portier (`src/proxy.ts`) redirige deja les visiteurs anonymes, mais il
 * possede un court-circuit pour les prechargements du navigateur : une requete
 * forgee avec l'en-tete `next-router-prefetch` et un cookie `sb-...auth-token`
 * quelconque le traverse sans verification. Chaque route IA doit donc verifier
 * elle-meme l'identite : c'est la clé Anthropic (payante) qui est derriere.
 *
 * Renvoie la reponse 401 a retourner telle quelle, ou `null` si l'appel est
 * legitime et que la route peut continuer.
 */
export async function refuserSiDeconnecte(): Promise<NextResponse | null> {
  const user = await utilisateurCourant()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }
  return null
}
