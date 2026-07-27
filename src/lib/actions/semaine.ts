'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleAcquisition(semaineId: string, eleveId: string, matiere: string, grapheme: string, acquis: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tu dois être connecté pour modifier le suivi.')

  const { data: semaine, error: semaineError } = await supabase
    .from('semaines')
    .select('id, class_id')
    .eq('id', semaineId)
    .single()
  if (semaineError || !semaine) throw new Error('Semaine introuvable ou non autorisée.')

  const { data: eleve, error: eleveError } = await supabase
    .from('eleves')
    .select('id')
    .eq('id', eleveId)
    .eq('class_id', semaine.class_id)
    .single()
  if (eleveError || !eleve) throw new Error('Élève introuvable ou non autorisé.')

  const { error } = await supabase.from('acquisitions').upsert(
    { semaine_id: semaineId, eleve_id: eleveId, matiere, grapheme, acquis },
    { onConflict: 'semaine_id,eleve_id,matiere,grapheme' }
  )
  if (error) throw new Error('Le suivi de cette notion n’a pas pu être enregistré.')
  revalidatePath(`/semaine/${semaineId}`)
}

export async function updateNote(semaineId: string, note: string) {
  const supabase = await createClient()
  await supabase.from('semaines').update({ note }).eq('id', semaineId)
  revalidatePath(`/semaine/${semaineId}`)
}
