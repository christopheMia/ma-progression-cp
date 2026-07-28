'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resultat, type Resultat } from '@/lib/resultat'

// Ces actions RENVOIENT leur message d'erreur au lieu de le lever : en
// production, Next.js efface le texte d'une erreur levee dans une action
// serveur. Voir `src/lib/resultat.ts`.

async function classeDeLUtilisateur() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tu dois être connectée pour modifier le programme.')
  const { data: classe } = await supabase
    .from('classes').select('id').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!classe) throw new Error('Classe introuvable.')
  return { supabase, classId: classe.id as string }
}

/**
 * Dit si une compétence officielle a été travaillée pendant une période.
 *
 * C'est la seule saisie de l'écran « Programme couvert » depuis le virage du
 * 28/07/2026 : le livret se remplit depuis le programme, plus depuis le manuel.
 */
export async function definirCompetenceTravaillee(
  periodeNumero: number,
  competenceId: string,
  travaillee: boolean,
): Promise<Resultat<void>> {
  return resultat(async () => {
    const { supabase, classId } = await classeDeLUtilisateur()

    if (travaillee) {
      const { error } = await supabase.from('competences_travaillees').upsert(
        { class_id: classId, periode_numero: periodeNumero, competence_id: competenceId },
        { onConflict: 'class_id,periode_numero,competence_id', ignoreDuplicates: true },
      )
      if (error) throw new Error('Le choix n’a pas pu être enregistré.')
    } else {
      const { error } = await supabase.from('competences_travaillees').delete()
        .eq('class_id', classId)
        .eq('periode_numero', periodeNumero)
        .eq('competence_id', competenceId)
      if (error) throw new Error('Le choix n’a pas pu être enregistré.')
    }

    revalidatePath('/programme')
    revalidatePath('/livret')
  }, 'Le choix n’a pas pu être enregistré.')
}

/**
 * Coche ou décoche un domaine entier d'un coup.
 *
 * Un domaine se travaille rarement à moitié, et cocher quinze cases une par une
 * est le genre de corvée qui fait abandonner l'écran. Rend les compétences
 * réellement changées, pour pouvoir revenir en arrière.
 */
export async function definirDomaineTravaille(
  periodeNumero: number,
  competenceIds: string[],
  travaillees: boolean,
): Promise<Resultat<string[]>> {
  return resultat(async () => {
    if (competenceIds.length === 0) return []
    const { supabase, classId } = await classeDeLUtilisateur()

    // Ce qui est deja dans l'etat voulu ne compte pas comme un changement :
    // sinon « revenir en arriere » decocherait ce qui l'etait deja avant.
    const { data: dejaLa } = await supabase.from('competences_travaillees')
      .select('competence_id')
      .eq('class_id', classId).eq('periode_numero', periodeNumero)
      .in('competence_id', competenceIds)
    const cochees = new Set((dejaLa ?? []).map(l => l.competence_id as string))
    const changees = competenceIds.filter(id => cochees.has(id) !== travaillees)
    if (changees.length === 0) return []

    if (travaillees) {
      const { error } = await supabase.from('competences_travaillees').upsert(
        changees.map(id => ({
          class_id: classId, periode_numero: periodeNumero, competence_id: id,
        })),
        { onConflict: 'class_id,periode_numero,competence_id', ignoreDuplicates: true },
      )
      if (error) throw new Error('Le domaine n’a pas pu être enregistré.')
    } else {
      const { error } = await supabase.from('competences_travaillees').delete()
        .eq('class_id', classId).eq('periode_numero', periodeNumero)
        .in('competence_id', changees)
      if (error) throw new Error('Le domaine n’a pas pu être enregistré.')
    }

    revalidatePath('/programme')
    revalidatePath('/livret')
    return changees
  }, 'Le domaine n’a pas pu être enregistré.')
}
