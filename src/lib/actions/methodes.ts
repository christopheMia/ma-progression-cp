'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Methode } from '@/types'

async function getClasse() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: classe } = await supabase
    .from('classes').select('id').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return classe ? { supabase, classeId: classe.id } : null
}

/** Retourne toutes les méthodes de la classe de l'utilisateur. */
export async function getMethodes(): Promise<Methode[]> {
  const ctx = await getClasse()
  if (!ctx) return []
  const { data } = await ctx.supabase
    .from('methodes').select('*').eq('class_id', ctx.classeId).order('created_at')
  return (data ?? []) as Methode[]
}

/**
 * Crée une méthode pour la matière donnée (ou renvoie l'existante si déjà créée).
 * Retourne l'id de la méthode.
 */
export async function createMethode(matiere: string): Promise<string> {
  const ctx = await getClasse()
  if (!ctx) throw new Error('Non connecté')
  const trimmed = matiere.trim()
  if (!trimmed) throw new Error('Matière vide')

  const { data: existing } = await ctx.supabase
    .from('methodes').select('id').eq('class_id', ctx.classeId).eq('matiere', trimmed)
    .limit(1).maybeSingle()
  if (existing) return existing.id

  const { data, error } = await ctx.supabase
    .from('methodes').insert({ class_id: ctx.classeId, matiere: trimmed })
    .select('id').single()
  if (error || !data) throw new Error(error?.message ?? 'Erreur création méthode')
  revalidatePath('/parametres')
  return data.id
}

/** Bascule le suivi étoiles pour une méthode. */
export async function updateSuiviActif(methodeId: string, suivi_actif: boolean) {
  const ctx = await getClasse()
  if (!ctx) throw new Error('Non connecté')
  await ctx.supabase.from('methodes').update({ suivi_actif }).eq('id', methodeId)
  revalidatePath('/parametres')
  revalidatePath('/planning')
}

/**
 * Renomme le manuel d'une méthode (ex. « Taoki »), sans réimport.
 *
 * Les méthodes importées avant l'ajout du champ n'ont aucun nom en base : sans
 * ce renommage, il aurait fallu tout réimporter juste pour afficher un libellé.
 * Une chaîne vide efface le nom.
 */
export async function renommerMethode(methodeId: string, nom: string) {
  const ctx = await getClasse()
  if (!ctx) throw new Error('Non connecté')
  const propre = nom.trim()
  await ctx.supabase.from('methodes')
    .update({ manuel: propre || null })
    .eq('id', methodeId)
    .eq('class_id', ctx.classeId) // ne renomme jamais la méthode d'une autre classe
  revalidatePath('/parametres')
  revalidatePath('/planning')
  revalidatePath('/accueil')
}

/**
 * Relie les créneaux sélectionnés à une méthode et déliera les précédents.
 * creneauIds : ids des emploi_du_temps à relier à cette méthode.
 */
export async function lierCreneaux(methodeId: string, creneauIds: string[]) {
  const ctx = await getClasse()
  if (!ctx) throw new Error('Non connecté')
  // Délier les anciens créneaux de cette méthode
  await ctx.supabase.from('emploi_du_temps')
    .update({ methode_id: null }).eq('methode_id', methodeId)
  // Relier les nouveaux
  if (creneauIds.length > 0) {
    await ctx.supabase.from('emploi_du_temps')
      .update({ methode_id: methodeId }).in('id', creneauIds)
  }
  revalidatePath('/parametres')
  revalidatePath('/planning')
}
