'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleAcquisition(semaineId: string, eleveId: string, grapheme: string, acquis: boolean) {
  const supabase = await createClient()
  await supabase.from('acquisitions').upsert(
    { semaine_id: semaineId, eleve_id: eleveId, grapheme, acquis },
    { onConflict: 'semaine_id,eleve_id,grapheme' }
  )
  revalidatePath(`/semaine/${semaineId}`)
}

export async function updateNote(semaineId: string, note: string) {
  const supabase = await createClient()
  await supabase.from('semaines').update({ note }).eq('id', semaineId)
  revalidatePath(`/semaine/${semaineId}`)
}
