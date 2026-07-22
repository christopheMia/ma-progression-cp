'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProgressionSemaine } from '@/data/manuels'
import { ensureMethode } from '@/lib/methodes-db'

/**
 * Enregistre la progression pour UNE matière, en remplaçant UNIQUEMENT
 * les lignes de cette matière (jamais l'autre). Les dates, l'EDM, le suivi
 * des élèves et les cahiers journaux sont préservés.
 */
export async function enregistrerProgressionMatiere(
  matiere: string,
  semaines: ProgressionSemaine[],
  /** Nom du manuel importe, affiche ensuite partout dans l'appli. */
  nomManuel?: string,
) {
  const trimmed = matiere.trim()
  if (!trimmed) throw new Error('Matière inconnue')
  matiere = trimmed
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')

  const { data: classe } = await supabase
    .from('classes')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!classe) throw new Error('Aucune classe')

  const methodeId = await ensureMethode(supabase, classe.id, matiere, nomManuel)

  const lignes = semaines.map(s => ({
    numero: s.numero,
    items: s.items,
    pages: s.pages || '',
    mots_exemple: s.mots_exemple ?? [],
  }))
  const { error } = await supabase.rpc('remplacer_progression', {
    p_class_id: classe.id,
    p_methode_id: methodeId,
    p_matiere: matiere,
    p_numeros: null,
    p_lignes: lignes,
    p_sync_semaines: false,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/planning')
  revalidatePath('/accueil')
}
