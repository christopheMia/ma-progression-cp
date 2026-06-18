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
        graphemes: s.items,
        manuel_pages: s.pages || null,
        mots_exemple: s.mots_exemple,
      })
      .eq('class_id', classId)
      .eq('numero', s.numero)
  }

  // Garde la table `progression` (lue par la fiche semaine) en phase avec la
  // correction : on remplace UNIQUEMENT le français (jamais le maths).
  await supabase.from('progression').delete().eq('class_id', classId).eq('matiere', 'francais')
  const lignesFr = progression.map(s => ({
    class_id: classId,
    matiere: 'francais' as const,
    numero: s.numero,
    items: s.items,
    pages: s.pages || null,
    mots_exemple: s.mots_exemple ?? null,
  }))
  if (lignesFr.length > 0) await supabase.from('progression').insert(lignesFr)

  revalidatePath('/planning')
  revalidatePath('/accueil')
}
