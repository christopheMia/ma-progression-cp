import type { SupabaseClient } from '@supabase/supabase-js'

/** Supprime des classes connues. Les FK `on delete cascade` nettoient toutes
 * les donnees dependantes dans une seule operation SQL. */
export async function supprimerClassesParIds(
  supabase: SupabaseClient,
  classIds: string[],
) {
  if (!classIds.length) return
  const { error } = await supabase.from('classes').delete().in('id', classIds)
  if (error) throw new Error(`Suppression des anciennes classes impossible : ${error.message}`)
}

/**
 * Supprime TOUTES les classes de l'utilisateur et leurs données dépendantes
 * (semaines, acquisitions, cahiers journaux, élèves, emploi du temps).
 * Utilisé par la réinitialisation et par la (re)création de classe pour éviter
 * l'accumulation de classes en double.
 */
export async function supprimerClassesUtilisateur(supabase: SupabaseClient, userId: string) {
  const { data: classes, error } = await supabase.from('classes').select('id').eq('user_id', userId)
  if (error) throw new Error(`Lecture des classes impossible : ${error.message}`)
  const classIds = (classes ?? []).map(c => c.id)
  await supprimerClassesParIds(supabase, classIds)
}
