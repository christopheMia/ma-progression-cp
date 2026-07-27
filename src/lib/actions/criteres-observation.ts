'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { normaliserLibelleCritere } from '@/lib/criteres-observation'
import { resultat, type Resultat } from '@/lib/resultat'
import type { CritereObservation } from '@/types'

// Ces actions RENVOIENT leur message d'erreur au lieu de le lever : en
// production, Next.js efface le texte d'une erreur levee dans une action
// serveur et l'enseignant ne lit qu'un digest. Voir `src/lib/resultat.ts`.

async function utilisateurConnecte() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tu dois être connecté pour modifier le suivi.')
  return supabase
}

async function semaineAutorisee(supabase: Awaited<ReturnType<typeof createClient>>, semaineId: string) {
  const { data: semaine, error } = await supabase
    .from('semaines')
    .select('id, class_id')
    .eq('id', semaineId)
    .single()
  if (error || !semaine) throw new Error('Semaine introuvable ou non autorisée.')
  return semaine
}

export async function ajouterCritereObservation(
  semaineId: string,
  matiere: string,
  notion: string,
  libelle: string,
): Promise<Resultat<CritereObservation>> {
  return resultat(async () => {
    const supabase = await utilisateurConnecte()
    await semaineAutorisee(supabase, semaineId)
    const libelleValide = normaliserLibelleCritere(libelle)
    const matiereValide = normaliserLibelleCritere(matiere)
    const notionValide = normaliserLibelleCritere(notion)

    const { data: dernier, error: ordreError } = await supabase
      .from('criteres_observation')
      .select('ordre')
      .eq('semaine_id', semaineId)
      .eq('matiere', matiereValide)
      .eq('notion', notionValide)
      .order('ordre', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (ordreError) throw new Error('Les critères n’ont pas pu être chargés.')

    const { data, error } = await supabase
      .from('criteres_observation')
      .insert({
        semaine_id: semaineId,
        matiere: matiereValide,
        notion: notionValide,
        libelle: libelleValide,
        ordre: (dernier?.ordre ?? -1) + 1,
      })
      .select('id, semaine_id, matiere, notion, libelle, ordre')
      .single()
    if (error || !data) {
      if (error?.code === '23505') throw new Error('Ce critère existe déjà pour cette notion.')
      throw new Error('Le critère n’a pas pu être ajouté.')
    }

    revalidatePath(`/semaine/${semaineId}`)
    return data as CritereObservation
  }, 'Le critère n’a pas pu être ajouté.')
}

export async function modifierCritereObservation(
  critereId: string,
  libelle: string,
): Promise<Resultat<CritereObservation>> {
  return resultat(async () => {
    const supabase = await utilisateurConnecte()
    const libelleValide = normaliserLibelleCritere(libelle)
    const { data: critere, error: lectureError } = await supabase
      .from('criteres_observation')
      .select('id, semaine_id')
      .eq('id', critereId)
      .single()
    if (lectureError || !critere) throw new Error('Critère introuvable ou non autorisé.')
    await semaineAutorisee(supabase, critere.semaine_id)

    const { data, error } = await supabase
      .from('criteres_observation')
      .update({ libelle: libelleValide, updated_at: new Date().toISOString() })
      .eq('id', critereId)
      .select('id, semaine_id, matiere, notion, libelle, ordre')
      .single()
    if (error || !data) {
      if (error?.code === '23505') throw new Error('Ce critère existe déjà pour cette notion.')
      throw new Error('Le critère n’a pas pu être modifié.')
    }

    revalidatePath(`/semaine/${critere.semaine_id}`)
    return data as CritereObservation
  }, 'Le critère n’a pas pu être modifié.')
}

export async function supprimerCritereObservation(critereId: string): Promise<Resultat<void>> {
  return resultat(async () => {
    const supabase = await utilisateurConnecte()
    const { data: critere, error: lectureError } = await supabase
      .from('criteres_observation')
      .select('id, semaine_id')
      .eq('id', critereId)
      .single()
    if (lectureError || !critere) throw new Error('Critère introuvable ou non autorisé.')
    await semaineAutorisee(supabase, critere.semaine_id)

    const { error } = await supabase.from('criteres_observation').delete().eq('id', critereId)
    if (error) throw new Error('Le critère n’a pas pu être supprimé.')
    revalidatePath(`/semaine/${critere.semaine_id}`)
  }, 'Le critère n’a pas pu être supprimé.')
}

export async function definirAcquisitionCritere(
  critereId: string,
  eleveId: string,
  acquis: boolean,
): Promise<Resultat<void>> {
  return resultat(async () => {
    const supabase = await utilisateurConnecte()
    const { data: critere, error: critereError } = await supabase
      .from('criteres_observation')
      .select('id, semaine_id')
      .eq('id', critereId)
      .single()
    if (critereError || !critere) throw new Error('Critère introuvable ou non autorisé.')
    const semaine = await semaineAutorisee(supabase, critere.semaine_id)

    const { data: eleve, error: eleveError } = await supabase
      .from('eleves')
      .select('id')
      .eq('id', eleveId)
      .eq('class_id', semaine.class_id)
      .single()
    if (eleveError || !eleve) throw new Error('Élève introuvable ou non autorisé.')

    const { error } = await supabase.from('acquisitions_criteres').upsert(
      {
        critere_id: critereId,
        eleve_id: eleveId,
        acquis,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'critere_id,eleve_id' },
    )
    if (error) throw new Error('Le suivi de ce critère n’a pas pu être enregistré.')
    revalidatePath(`/semaine/${critere.semaine_id}`)
  }, 'Le suivi de ce critère n’a pas pu être enregistré.')
}
