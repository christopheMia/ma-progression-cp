'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { estAcquis, estNiveau, type Niveau } from '@/lib/niveaux'
import { resultat, type Resultat } from '@/lib/resultat'

/**
 * Le suivi d'une notion, sur les quatre niveaux du livret.
 *
 * S'appelait `toggleAcquisition` tant que le suivi était binaire. Elle RENVOIE
 * maintenant son message d'erreur au lieu de le lever : en production, Next.js
 * efface le texte d'une erreur levée dans une action serveur et l'enseignant ne
 * lit qu'un digest. Voir `src/lib/resultat.ts`.
 *
 * La colonne `acquis` est écrite ici aussi, en plus du niveau. Le trigger de la
 * migration 019 la recalculerait de toute façon ; l'écrire explicitement garde
 * la ligne juste même si le trigger venait à disparaître.
 */
export async function definirNiveauNotion(
  semaineId: string,
  eleveId: string,
  matiere: string,
  grapheme: string,
  niveau: Niveau,
): Promise<Resultat<void>> {
  return resultat(async () => {
    if (!estNiveau(niveau)) throw new Error('Ce niveau n’existe pas.')

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
      {
        semaine_id: semaineId,
        eleve_id: eleveId,
        matiere,
        grapheme,
        niveau,
        acquis: estAcquis(niveau),
      },
      { onConflict: 'semaine_id,eleve_id,matiere,grapheme' }
    )
    if (error) throw new Error('Le suivi de cette notion n’a pas pu être enregistré.')
    revalidatePath(`/semaine/${semaineId}`)
  }, 'Le suivi de cette notion n’a pas pu être enregistré.')
}

export async function updateNote(semaineId: string, note: string) {
  const supabase = await createClient()
  await supabase.from('semaines').update({ note }).eq('id', semaineId)
  revalidatePath(`/semaine/${semaineId}`)
}
