'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  executerAjoutSourceProgression,
  executerRetraitSourceProgression,
  type MethodeSourcesDependances,
  type SourceProgressionBdd,
} from '@/lib/methode-sources'
import type { SourceProgression } from '@/lib/progression-sources'

export async function ajouterSourceProgression(source: SourceProgression) {
  return executerAjoutSourceProgression(source, await creerDependances())
}

export async function retirerSourceProgression(sourceId: string) {
  await executerRetraitSourceProgression(sourceId, await creerDependances())
}

async function creerDependances(): Promise<MethodeSourcesDependances> {
  const supabase = await createClient()

  return {
    async lireContexte() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Tu dois être connecté pour modifier les documents.')
      const { data: classe, error } = await supabase
        .from('classes')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(`Lecture de la classe impossible : ${error.message}`)
      if (!classe) throw new Error('Classe introuvable.')
      return { classId: classe.id }
    },

    async trouverMethode(classId, matiere) {
      const { data, error } = await supabase
        .from('methodes')
        .select('id, matiere, manuel')
        .eq('class_id', classId)
        .eq('matiere', matiere)
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(`Lecture de la méthode impossible : ${error.message}`)
      return data
    },

    async lireMethodeParId(classId, methodeId) {
      const { data, error } = await supabase
        .from('methodes')
        .select('id, matiere, manuel')
        .eq('class_id', classId)
        .eq('id', methodeId)
        .maybeSingle()
      if (error) throw new Error(`Lecture de la méthode impossible : ${error.message}`)
      return data
    },

    async creerMethode(classId, matiere, nomMethode) {
      const { data, error } = await supabase
        .from('methodes')
        .insert({
          class_id: classId,
          matiere,
          manuel: nomMethode,
          suivi_actif: true,
        })
        .select('id')
        .single()
      if (error || !data) {
        throw new Error(
          `Création de la méthode impossible : ${error?.message ?? 'réponse vide'}. `
          + 'Une autre modification a peut-être eu lieu. Recharge la page puis réessaie.',
        )
      }
      return data.id
    },

    async lireSource(sourceId) {
      const { data, error } = await supabase
        .from('methode_sources')
        .select(CHAMPS_SOURCE)
        .eq('id', sourceId)
        .maybeSingle()
      if (error) throw new Error(`Lecture du document impossible : ${error.message}`)
      return data as unknown as SourceProgressionBdd | null
    },

    async lireSources(methodeId) {
      const { data, error } = await supabase
        .from('methode_sources')
        .select(CHAMPS_SOURCE)
        .eq('methode_id', methodeId)
        .order('created_at')
        .order('id')
      if (error) throw new Error(`Lecture des documents impossible : ${error.message}`)
      return (data ?? []) as unknown as SourceProgressionBdd[]
    },

    async lireSemaines(classId) {
      const { data, error } = await supabase
        .from('semaines')
        .select('id, numero, periode_numero')
        .eq('class_id', classId)
        .order('numero')
      if (error) throw new Error(`Lecture des semaines impossible : ${error.message}`)
      return (data ?? []).map(semaine => ({
        id: semaine.id,
        numero: semaine.numero,
        periode_numero: semaine.periode_numero ?? null,
      }))
    },

    async enregistrerSource(params) {
      const { data, error } = await supabase.rpc(
        'enregistrer_source_progression',
        params,
      )
      if (error) throw erreurRpc('Ajout du document impossible', error.message)
      if (typeof data !== 'string' || !data) {
        throw new Error('Ajout du document impossible : identifiant absent.')
      }
      return data
    },

    async retirerSource(params) {
      const { error } = await supabase.rpc(
        'retirer_source_progression',
        params,
      )
      if (error) throw erreurRpc('Retrait du document impossible', error.message)
    },

    async methodeEstVide(methodeId) {
      const { data, error } = await supabase
        .from('methode_sources')
        .select('id')
        .eq('methode_id', methodeId)
        .limit(1)
      if (error) {
        throw new Error(
          `Vérification du retour arrière impossible : ${error.message}`,
        )
      }
      return (data ?? []).length === 0
    },

    async supprimerMethodeCreee(classId, methodeId) {
      const { error } = await supabase
        .from('methodes')
        .delete()
        .eq('id', methodeId)
        .eq('class_id', classId)
      if (error) {
        throw new Error(`Nettoyage de la méthode vide impossible : ${error.message}`)
      }
    },

    async revalider(semaineIds) {
      revalidatePath('/parametres')
      revalidatePath('/planning')
      revalidatePath('/periodes')
      revalidatePath('/accueil')
      for (const semaineId of semaineIds) {
        revalidatePath(`/semaine/${semaineId}`)
      }
    },
  }
}

const CHAMPS_SOURCE = [
  'id',
  'methode_id',
  'nom_source',
  'type_document',
  'periode_numero',
  'niveau_precision',
  'contenu_structure',
  'empreinte_contenu',
  'created_at',
].join(', ')

function erreurRpc(prefixe: string, message: string): Error {
  if (message.toLocaleLowerCase('fr-FR').includes('documents ont change')) {
    return new Error(
      'Les documents ont changé pendant cette opération. Recharge la page puis réessaie.',
    )
  }
  return new Error(`${prefixe} : ${message}`)
}
