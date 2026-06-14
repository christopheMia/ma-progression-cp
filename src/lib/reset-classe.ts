import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Supprime TOUTES les classes de l'utilisateur et leurs données dépendantes
 * (semaines, acquisitions, cahiers journaux, élèves, emploi du temps).
 * Utilisé par la réinitialisation et par la (re)création de classe pour éviter
 * l'accumulation de classes en double.
 */
export async function supprimerClassesUtilisateur(supabase: SupabaseClient, userId: string) {
  const { data: classes } = await supabase.from('classes').select('id').eq('user_id', userId)
  const classIds = (classes ?? []).map(c => c.id)
  if (!classIds.length) return

  const { data: semaines } = await supabase.from('semaines').select('id').in('class_id', classIds)
  const semaineIds = (semaines ?? []).map(s => s.id)
  if (semaineIds.length) {
    await supabase.from('acquisitions').delete().in('semaine_id', semaineIds)
    await supabase.from('cahier_journal').delete().in('semaine_id', semaineIds)
    await supabase.from('semaines').delete().in('id', semaineIds)
  }
  await supabase.from('eleves').delete().in('class_id', classIds)
  await supabase.from('emploi_du_temps').delete().in('class_id', classIds)
  await supabase.from('classes').delete().in('id', classIds)
}
