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

/**
 * La classe la plus récente de l'utilisateur, ou `null` s'il n'en a pas.
 *
 * Aucun `user_id` n'est passé, et c'est volontaire : la table `classes` est
 * protégée par RLS (« Users manage own class »), donc PostgreSQL ne renvoie
 * déjà que les classes de la personne connectée. Filtrer en plus côté
 * application obligeait à connaître son identifiant, donc à appeler `getUser`,
 * donc à payer un aller-retour reseau de plus a chaque navigation de menu (les
 * layouts ne sont pas re-rendus entre deux pages soeurs, la page ne pouvait
 * donc pas partager celui du layout).
 *
 * La sécurité ne se relâche pas, elle se rapproche de la base : c'est la
 * politique RLS qui décide, pas une clause `where` qu'on pourrait oublier.
 */
export const classeCourante = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('classes')
    .select('id, prenom_enseignant, rentree_date, zone_scolaire')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
})
