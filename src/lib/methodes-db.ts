import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Récupère l'id de la méthode (class_id, matiere) en la créant si elle n'existe pas.
 * Utilisé par tous les chemins qui écrivent dans `progression` pour garantir le lien.
 */
export async function ensureMethode(
  supabase: SupabaseClient,
  classId: string,
  matiere: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from('methodes').select('id')
    .eq('class_id', classId).eq('matiere', matiere)
    .limit(1).maybeSingle()
  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('methodes').insert({ class_id: classId, matiere })
    .select('id').single()
  if (error || !created) throw new Error(error?.message ?? 'Création de méthode impossible')
  return created.id
}
