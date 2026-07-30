'use server'
import { createClient } from '@/lib/supabase/server'
import { utilisateurCourant } from '@/lib/supabase/session'
import { coutUsd, sommeCoutDepuis, usageDepuisReponse } from '@/lib/ia/cout'

function moisCourant(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Enregistre ce qu un appel IA a reellement coute.
 *
 * Rattache a l UTILISATEUR et non a la classe : reinitialiser sa classe ne doit
 * pas remettre le compteur a zero pendant que la facture, elle, continue. La
 * classe n est qu une information d appoint, nulle si l appel a eu lieu avant
 * le setup (l assistant est accessible des la premiere connexion).
 */
export async function enregistrerUsageIA(params: {
  route: string
  modele: string
  usage: unknown
}) {
  try {
    const supabase = await createClient()
    // `utilisateurCourant` et non `auth.getUser` : le garde de la route vient
    // de payer ce meme appel reseau, le cache de requete nous le rend gratuit.
    const user = await utilisateurCourant()
    if (!user) return

    const usage = usageDepuisReponse(params.usage)
    const { data: classe } = await supabase.from('classes').select('id')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()

    const { error } = await supabase.from('ia_usage').insert({
      user_id: user.id,
      class_id: classe?.id ?? null,
      mois: moisCourant(),
      input_tokens: usage.input,
      cache_creation_tokens: usage.cacheCreation,
      cache_read_tokens: usage.cacheRead,
      output_tokens: usage.output,
      cout_usd: coutUsd(params.modele, usage),
      route: params.route,
      modele: params.modele,
    })
    // Un echec ne doit pas casser la reponse a l ecran, mais il ne doit plus
    // disparaitre en silence : c est comme ca qu on perd des euros sans le voir.
    if (error) console.error('[ia_usage] enregistrement echoue:', error.message)
  } catch (err) {
    console.error('[ia_usage] enregistrement echoue:', err)
  }
}

export type SoldeIA = {
  /** Dollars consommes depuis le dernier releve (ou depuis toujours, a defaut). */
  consommeUsd: number
  /** Solde restant estime, ou `null` tant qu aucun releve n a ete saisi. */
  restantUsd: number | null
  /** Date du dernier releve manuel, ou `null`. */
  releveAt: string | null
  /** Solde saisi lors de ce releve. */
  soldeReleveUsd: number | null
}

/**
 * Le solde estime, ancre sur le dernier releve manuel.
 *
 * L API de couts d Anthropic est reservee aux comptes organisation : une
 * application comme celle-ci ne PEUT PAS lire le solde reel. Elle ne sait
 * qu additionner ce qu elle a vu passer, et elle ne voit pas tout (appels
 * lances hors de l application, par exemple).
 *
 * D ou l ancrage : l utilisateur releve son solde sur la console Anthropic,
 * l application y ajoute sa propre estimation depuis cette date. Chaque nouveau
 * releve efface la derive accumulee.
 *
 * COUT DE NAVIGATION : cette fonction s affiche sur l accueil et dans les
 * parametres, elle est donc payee a chaque visite. Sa premiere version faisait
 * TROIS allers-retours en serie (getUser, releve, lignes), soit ~450 ms au
 * plancher de 150 ms l appel : Christophe l a senti le jour meme du deploiement
 * (« l application n est pas reactive »). Regles pour ne pas y revenir :
 * - pas de `getUser` : RLS (`user_id = auth.uid()`) borne deja les deux tables
 *   a la personne connectee, exactement comme `classes` (voir session.ts) ;
 *   sans session, les requetes rendent zero ligne et le solde reste vide.
 *   (La regle « ne pas s appuyer sur RLS » vaut pour les filtres class_id des
 *   remplacants multi-classes ; ici la borne est l identite elle-meme.)
 * - les deux lectures partent dans la MEME vague, le filtre de date se fait en
 *   memoire (`sommeCoutDepuis`). On lit `cout_usd` et `created_at`, rien
 *   d autre : quelques milliers de lignes par an au pire, negligeable.
 */
export async function soldeIA(): Promise<SoldeIA> {
  const vide: SoldeIA = { consommeUsd: 0, restantUsd: null, releveAt: null, soldeReleveUsd: null }
  try {
    const supabase = await createClient()
    const [{ data: repere }, { data: lignes }] = await Promise.all([
      supabase.from('ia_solde').select('solde_usd, releve_at').maybeSingle(),
      supabase.from('ia_usage').select('cout_usd, created_at'),
    ])

    const consommeUsd = sommeCoutDepuis(lignes ?? [], repere?.releve_at ?? null)
    const soldeReleveUsd = repere ? Number(repere.solde_usd) : null

    return {
      consommeUsd,
      restantUsd: soldeReleveUsd === null ? null : soldeReleveUsd - consommeUsd,
      releveAt: repere?.releve_at ?? null,
      soldeReleveUsd,
    }
  } catch (err) {
    console.error('[ia_usage] lecture du solde echouee:', err)
    return vide
  }
}

/** Enregistre le solde reel releve sur la console Anthropic. */
export async function enregistrerSoldeReleve(soldeUsd: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, erreur: 'Non connecté.' }
  if (!Number.isFinite(soldeUsd) || soldeUsd < 0) {
    return { ok: false as const, erreur: 'Montant invalide.' }
  }

  const maintenant = new Date().toISOString()
  const { error } = await supabase.from('ia_solde').upsert({
    user_id: user.id,
    solde_usd: soldeUsd,
    releve_at: maintenant,
    updated_at: maintenant,
  }, { onConflict: 'user_id' })

  if (error) return { ok: false as const, erreur: error.message }
  return { ok: true as const }
}
