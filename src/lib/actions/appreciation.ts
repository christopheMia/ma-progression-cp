'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/** Enregistre le bilan (statut) et le commentaire libre d'un élève pour une semaine. */
export async function upsertAppreciation(
  semaineId: string,
  eleveId: string,
  statut: string | null,
  commentaire: string | null
) {
  const supabase = await createClient()
  await supabase.from('appreciations').upsert(
    {
      semaine_id: semaineId,
      eleve_id: eleveId,
      statut,
      commentaire,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'semaine_id,eleve_id' }
  )
  revalidatePath(`/semaine/${semaineId}`)
}
