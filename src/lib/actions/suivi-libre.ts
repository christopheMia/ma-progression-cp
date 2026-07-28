'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { estEtatComportement, type EtatComportement } from '@/lib/comportement'
import { resultat, type Resultat } from '@/lib/resultat'

// Ces actions RENVOIENT leur message d'erreur au lieu de le lever : en
// production, Next.js efface le texte d'une erreur levee dans une action
// serveur. Voir `src/lib/resultat.ts`.

async function classeDeLUtilisateur() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tu dois être connectée pour modifier le suivi.')
  const { data: classe } = await supabase
    .from('classes').select('id').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!classe) throw new Error('Classe introuvable.')
  return { supabase, classId: classe.id as string }
}

/** Comment s'est passée la semaine. `null` remet à « rien de noté ». */
export async function definirComportement(
  eleveId: string,
  semaineId: string,
  etat: EtatComportement | null,
): Promise<Resultat<void>> {
  return resultat(async () => {
    const { supabase, classId } = await classeDeLUtilisateur()

    if (etat === null) {
      const { error } = await supabase.from('comportements_semaine').delete()
        .eq('eleve_id', eleveId).eq('semaine_id', semaineId).eq('class_id', classId)
      if (error) throw new Error('Le choix n’a pas pu être enregistré.')
    } else {
      if (!estEtatComportement(etat)) throw new Error('Cet état n’existe pas.')
      const { error } = await supabase.from('comportements_semaine').upsert({
        class_id: classId,
        eleve_id: eleveId,
        semaine_id: semaineId,
        etat,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'eleve_id,semaine_id' })
      if (error) throw new Error('Le choix n’a pas pu être enregistré.')
    }

    revalidatePath(`/semaine/${semaineId}`)
    revalidatePath('/livret')
  }, 'Le choix n’a pas pu être enregistré.')
}

/** Ajoute une observation datée, et rend son identifiant. */
export async function ajouterObservation(
  eleveId: string,
  semaineId: string,
  observeeLe: string,
): Promise<Resultat<string>> {
  return resultat(async () => {
    const { supabase, classId } = await classeDeLUtilisateur()

    const { data, error } = await supabase.from('observations').insert({
      class_id: classId,
      eleve_id: eleveId,
      semaine_id: semaineId,
      observee_le: observeeLe,
      texte: '',
    }).select('id').single()
    if (error || !data) throw new Error('L’observation n’a pas pu être ajoutée.')

    revalidatePath(`/semaine/${semaineId}`)
    revalidatePath('/livret')
    return data.id as string
  }, 'L’observation n’a pas pu être ajoutée.')
}

export async function modifierObservation(
  observationId: string,
  texte: string,
  observeeLe: string,
): Promise<Resultat<void>> {
  return resultat(async () => {
    const { supabase, classId } = await classeDeLUtilisateur()

    const { error } = await supabase.from('observations')
      .update({ texte, observee_le: observeeLe, updated_at: new Date().toISOString() })
      .eq('id', observationId).eq('class_id', classId)
    if (error) throw new Error('L’observation n’a pas pu être enregistrée.')

    revalidatePath('/livret')
  }, 'L’observation n’a pas pu être enregistrée.')
}

export async function supprimerObservation(
  observationId: string,
): Promise<Resultat<void>> {
  return resultat(async () => {
    const { supabase, classId } = await classeDeLUtilisateur()

    const { error } = await supabase.from('observations')
      .delete().eq('id', observationId).eq('class_id', classId)
    if (error) throw new Error('L’observation n’a pas pu être retirée.')

    revalidatePath('/livret')
  }, 'L’observation n’a pas pu être retirée.')
}
