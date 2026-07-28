'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { estNiveau, type Niveau } from '@/lib/niveaux'
import { resultat, type Resultat } from '@/lib/resultat'

// Ces actions RENVOIENT leur message d'erreur au lieu de le lever : en
// production, Next.js efface le texte d'une erreur levee dans une action
// serveur. Voir `src/lib/resultat.ts`.

async function classeDeLUtilisateur() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tu dois être connectée pour modifier le livret.')
  const { data: classe } = await supabase
    .from('classes').select('id').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!classe) throw new Error('Classe introuvable.')
  return { supabase, classId: classe.id as string }
}

/** Le positionnement corrigé à la main sur une compétence. */
export async function definirPositionnement(
  eleveId: string,
  periodeNumero: number,
  competenceId: string,
  niveau: Niveau,
): Promise<Resultat<void>> {
  return resultat(async () => {
    if (!estNiveau(niveau)) throw new Error('Ce niveau n’existe pas.')
    const { supabase, classId } = await classeDeLUtilisateur()

    const { error } = await supabase.from('positionnements_periode').upsert({
      class_id: classId,
      eleve_id: eleveId,
      periode_numero: periodeNumero,
      competence_id: competenceId,
      niveau,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'class_id,eleve_id,periode_numero,competence_id' })
    if (error) throw new Error('Le positionnement n’a pas pu être enregistré.')

    revalidatePath('/livret')
  }, 'Le positionnement n’a pas pu être enregistré.')
}

/**
 * L'appréciation d'une matière : le texte rédigé, les briques écartées et les
 * briques réécrites. Tout part ensemble, parce que tout se relit ensemble.
 */
export async function enregistrerAppreciationPeriode(
  eleveId: string,
  periodeNumero: number,
  matiere: string,
  texte: string,
  ecartees: string[],
  retouchees: Record<string, { texte: string; suite: string }>,
): Promise<Resultat<void>> {
  return resultat(async () => {
    const { supabase, classId } = await classeDeLUtilisateur()

    const { error } = await supabase.from('appreciations_periode').upsert({
      class_id: classId,
      eleve_id: eleveId,
      periode_numero: periodeNumero,
      matiere,
      texte,
      briques_ecartees: ecartees,
      briques_retouchees: retouchees,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'class_id,eleve_id,periode_numero,matiere' })
    if (error) throw new Error('L’appréciation n’a pas pu être enregistrée.')

    revalidatePath('/livret')
  }, 'L’appréciation n’a pas pu être enregistrée.')
}

/**
 * Comment l'enseignante dit une compétence à un parent, une phrase par niveau.
 *
 * Écrites une fois, elles resservent chaque année : c'est pour ça qu'elles
 * vivent sur la classe et pas sur l'élève.
 */
export async function enregistrerFormulation(
  competenceId: string,
  phrases: { eclat: string; reussite: string; encours: string; vigilance: string; suite: string },
): Promise<Resultat<void>> {
  return resultat(async () => {
    const { supabase, classId } = await classeDeLUtilisateur()

    const { error } = await supabase.from('formulations_competence').upsert({
      class_id: classId,
      competence_id: competenceId,
      eclat: phrases.eclat.trim(),
      reussite: phrases.reussite.trim(),
      encours: phrases.encours.trim(),
      vigilance: phrases.vigilance.trim(),
      suite: phrases.suite.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'class_id,competence_id' })
    if (error) throw new Error('La formulation n’a pas pu être enregistrée.')

    revalidatePath('/livret')
  }, 'La formulation n’a pas pu être enregistrée.')
}

/** Fille ou garçon, pour que le livret écrive « Il » ou « Elle ». */
export async function definirGenreEleve(
  eleveId: string,
  genre: 'f' | 'm' | null,
): Promise<Resultat<void>> {
  return resultat(async () => {
    if (genre !== null && genre !== 'f' && genre !== 'm') {
      throw new Error('Valeur inattendue.')
    }
    const { supabase, classId } = await classeDeLUtilisateur()

    const { error } = await supabase.from('eleves')
      .update({ genre }).eq('id', eleveId).eq('class_id', classId)
    if (error) throw new Error('Le choix n’a pas pu être enregistré.')

    revalidatePath('/livret')
    revalidatePath('/parametres')
  }, 'Le choix n’a pas pu être enregistré.')
}
