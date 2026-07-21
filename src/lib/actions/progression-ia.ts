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

  for (const s of progression) {
    const { error } = await supabase.from('semaines')
      .update({
        graphemes: s.items,
        manuel_pages: s.pages || null,
        mots_exemple: s.mots_exemple,
      })
      .eq('class_id', classId)
      .eq('numero', s.numero)
    if (error) throw new Error(`Semaine ${s.numero} : ${error.message}`)
  }

  // Garde la table `progression` (lue par la fiche semaine) en phase avec la
  // correction : on remplace UNIQUEMENT le français (jamais le maths).
  //
  // ORDRE IMPORTANT : la méthode est créée AVANT l'effacement. L'inverse a
  // détruit la progression en production le 20/07 : `ensureMethode` a échoué
  // après le delete, laissant `progression` et `methodes` vides toutes les deux
  // alors que l'utilisateur croyait son import réussi.
  const methodeId = await ensureMethode(supabase, classId, 'francais')
  const { error: erreurEffacement } = await supabase
    .from('progression').delete().eq('class_id', classId).eq('matiere', 'francais')
  if (erreurEffacement) throw new Error(erreurEffacement.message)
  const lignesFr = progression.map(s => ({
    class_id: classId,
    methode_id: methodeId,
    matiere: 'francais' as const,
    numero: s.numero,
    items: s.items,
    pages: s.pages || null,
    mots_exemple: s.mots_exemple ?? null,
  }))
  // L'erreur était ici IGNOREE : un échec d'insertion ne remontait pas, et
  // l'utilisateur voyait « import réussi » avec une table vide derrière.
  if (lignesFr.length > 0) {
    const { error } = await supabase.from('progression').insert(lignesFr)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/planning')
  revalidatePath('/accueil')
}
