'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProgressionSemaine } from '@/data/manuels'
import { ensureMethode } from '@/lib/methodes-db'

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

  // La table `progression` et les colonnes historiques de `semaines` sont mises
  // a jour dans la meme transaction PostgreSQL. Une erreur annule tout.
  const methodeId = await ensureMethode(supabase, classId, 'francais')
  const lignesFr = progression.map(s => ({
    numero: s.numero,
    items: s.items,
    pages: s.pages || '',
    mots_exemple: s.mots_exemple ?? [],
  }))
  const { error } = await supabase.rpc('remplacer_progression', {
    p_class_id: classId,
    p_methode_id: methodeId,
    p_matiere: 'francais',
    p_numeros: null,
    p_lignes: lignesFr,
    p_sync_semaines: true,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/planning')
  revalidatePath('/accueil')
}
