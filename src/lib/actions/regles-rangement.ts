'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resultat, type Resultat } from '@/lib/resultat'
import {
  casesDisponibles, lireReglesCompletes, preparerRegle, tableAbsente, type CaseDisponible,
} from '@/lib/regles-rangement'
import type { JourSemaine, RegleRangement } from '@/types'

// Ces actions RENVOIENT leur message d'erreur au lieu de le lever : en
// production, Next.js efface le texte d'une erreur levée dans une action
// serveur et l'enseignante ne lirait qu'un digest. Voir `src/lib/resultat.ts`.

type Client = Awaited<ReturnType<typeof createClient>>

const CARNET_PAS_PRET = 'Le carnet de rangement n’est pas encore prêt. Il sera disponible très bientôt.'

async function maClasse(): Promise<{ supabase: Client; classId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tu dois être connectée pour modifier ton rangement.')
  const { data: classe, error } = await supabase.from('classes').select('id')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error || !classe) throw new Error('Ta classe est introuvable.')
  return { supabase, classId: classe.id as string }
}

async function casesDe(supabase: Client, classId: string): Promise<CaseDisponible[]> {
  const { data, error } = await supabase.from('emploi_du_temps')
    .select('jour, matiere, type, visible_journal').eq('class_id', classId)
  if (error) throw new Error('Ton emploi du temps n’a pas pu être lu.')
  return casesDisponibles((data ?? []) as Parameters<typeof casesDisponibles>[0])
}

/** Les cases de cours visibles de la classe, pour les choix et pour l'IA. */
export async function casesDeMaClasse(): Promise<Resultat<CaseDisponible[]>> {
  return resultat(async () => {
    const { supabase, classId } = await maClasse()
    return casesDe(supabase, classId)
  }, 'Ton emploi du temps n’a pas pu être lu.')
}

/**
 * Enregistre une règle. Sans `id`, une règle pour un type déjà rangé le
 * remplace (une règle par type et par classe). Avec `id`, la règle est
 * modifiée. La case est vérifiée contre l'emploi du temps de la classe.
 */
export async function enregistrerRegle(entree: {
  id?: string
  type: string
  creneau: string
  jour: JourSemaine | null
  origine?: RegleRangement['origine']
}): Promise<Resultat<RegleRangement>> {
  return resultat(async () => {
    const { supabase, classId } = await maClasse()
    const prete = preparerRegle(entree, await casesDe(supabase, classId))
    if (!prete.ok) throw new Error(prete.message)
    const champs = { ...prete.valeur, updated_at: new Date().toISOString() }
    const colonnes = 'id, class_id, type, type_cle, creneau, jour, origine'
    const { data, error } = entree.id
      ? await supabase.from('regles_rangement').update(champs)
        .eq('id', entree.id).eq('class_id', classId).select(colonnes).single()
      : await supabase.from('regles_rangement')
        .upsert({ ...champs, class_id: classId, origine: entree.origine ?? 'main' }, { onConflict: 'class_id,type_cle' })
        .select(colonnes).single()
    if (tableAbsente(error)) throw new Error(CARNET_PAS_PRET)
    if (error?.code === '23505') throw new Error(`Tu as déjà une règle pour « ${prete.valeur.type} ». Modifie celle-là.`)
    const [regle] = lireReglesCompletes(data ? [data] : [])
    if (error || !regle) throw new Error('La règle n’a pas pu être enregistrée.')
    revalidatePath('/parametres')
    return regle
  }, 'La règle n’a pas pu être enregistrée.')
}

export async function supprimerRegle(id: string): Promise<Resultat<void>> {
  return resultat(async () => {
    const { supabase, classId } = await maClasse()
    const { error } = await supabase.from('regles_rangement').delete().eq('id', id).eq('class_id', classId)
    if (tableAbsente(error)) throw new Error(CARNET_PAS_PRET)
    if (error) throw new Error('La règle n’a pas pu être supprimée.')
    revalidatePath('/parametres')
  }, 'La règle n’a pas pu être supprimée.')
}
