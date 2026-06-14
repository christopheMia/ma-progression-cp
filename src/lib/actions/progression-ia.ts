'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProgressionSemaine } from '@/data/manuels'

/**
 * Met à jour la progression d'une classe SANS rien détruire :
 * seuls les champs graphèmes / pages / mots de chaque semaine sont modifiés
 * (par numéro de semaine). Les dates, l'EDM, le suivi des élèves et les cahiers
 * journaux sont préservés. À l'inverse de `updateManuel` (destructif).
 */
export async function corrigerProgression(classId: string, progression: ProgressionSemaine[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')

  // Sécurité : la classe doit appartenir à l'utilisateur connecté.
  const { data: classe } = await supabase
    .from('classes').select('id').eq('id', classId).eq('user_id', user.id).maybeSingle()
  if (!classe) throw new Error('Classe introuvable')

  for (const s of progression) {
    await supabase.from('semaines')
      .update({
        graphemes: s.graphemes,
        manuel_pages: s.pages || null,
        mots_exemple: s.mots_exemple,
      })
      .eq('class_id', classId)
      .eq('numero', s.numero)
  }

  revalidatePath('/planning')
  revalidatePath('/accueil')
}
