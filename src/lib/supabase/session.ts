import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * L'identité et la classe, demandées UNE SEULE FOIS par requête.
 *
 * Le layout de l'application vérifie l'utilisateur et charge sa classe, puis
 * chaque page recommence exactement les deux mêmes appels. Cela faisait quatre
 * allers-retours vers Supabase avant que la moindre donnée utile ne parte, à
 * chaque changement de menu (retour de Christophe du 29/07 : « c'est toujours
 * lent entre les menus »).
 *
 * `cache` de React garde le résultat pour la durée d'UNE requête serveur, et
 * pas plus : deux visiteurs ne partagent jamais rien, et rien ne survit d'une
 * navigation à l'autre. C'est de la déduplication, pas de la mise en cache.
 */
export const utilisateurCourant = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

/** La classe la plus récente de l'utilisateur, ou `null` s'il n'en a pas. */
export const classeCourante = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('classes')
    .select('id, prenom_enseignant, rentree_date, zone_scolaire')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
})
