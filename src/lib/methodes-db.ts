import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Récupère l'id de la méthode (class_id, matiere) en la créant si elle n'existe pas.
 * Utilisé par tous les chemins qui écrivent dans `progression` pour garantir le lien.
 */
export async function ensureMethode(
  supabase: SupabaseClient,
  classId: string,
  matiere: string,
  /** Nom du manuel importe (ex. "Taoki", "Pilotis"). Renseigne la colonne
   *  `manuel`, qui existait mais n'etait jamais remplie : l'enseignante ne
   *  pouvait donc pas savoir QUELLE methode elle avait importee (retour du 20/07). */
  nomManuel?: string,
): Promise<string> {
  const nom = nomManuel?.trim() || null

  const { data: existing } = await supabase
    .from('methodes').select('id, manuel')
    .eq('class_id', classId).eq('matiere', matiere)
    .limit(1).maybeSingle()

  if (existing) {
    // On ne met a jour que si un NOUVEAU nom est fourni : un import ulterieur
    // sans nom ne doit pas effacer l'information deja connue.
    if (nom && nom !== existing.manuel) {
      await supabase.from('methodes').update({ manuel: nom }).eq('id', existing.id)
    }
    return existing.id
  }

  const { data: created, error } = await supabase
    .from('methodes').insert({ class_id: classId, matiere, manuel: nom })
    .select('id').single()
  if (error || !created) throw new Error(error?.message ?? 'Création de méthode impossible')
  return created.id
}
