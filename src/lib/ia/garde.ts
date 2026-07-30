import { NextResponse } from 'next/server'
import { utilisateurCourant } from '@/lib/supabase/session'
import { soldeIA } from '@/lib/actions/ia-usage'

/**
 * Le portier des routes IA : connexion exigee, credit exige.
 *
 * Deux verrous, pour deux problemes distincts constates le 30/07/2026.
 *
 * 1. CONNEXION. Le portier de l application (`src/proxy.ts`) laisse passer les
 *    prechargements du navigateur des qu un cookie `sb-...auth-token` existe,
 *    meme forge. Une requete fabriquee atteignait donc les routes IA sans
 *    verification et consommait la cle Anthropic.
 *
 * 2. CREDIT. La jauge affichait la consommation sans jamais rien bloquer. Sur
 *    5 $ credites, 3,26 sont partis sans qu aucun garde-fou ne se declenche.
 *    Tant qu aucun releve de solde n a ete saisi, on ne bloque PAS : mieux vaut
 *    laisser passer que refuser sur une estimation qu on sait incomplete.
 *
 * Renvoie la reponse a retourner telle quelle, ou `null` si l appel peut
 * continuer.
 */
export async function garderAppelIA(): Promise<NextResponse | null> {
  const user = await utilisateurCourant()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  const { restantUsd } = await soldeIA()
  if (restantUsd !== null && restantUsd <= 0) {
    return NextResponse.json(
      {
        error: "Le crédit IA est épuisé d'après l'estimation. Recharge ton compte Anthropic, "
          + 'puis mets à jour ton relevé de solde dans Paramètres.',
      },
      { status: 402 }
    )
  }

  return null
}
