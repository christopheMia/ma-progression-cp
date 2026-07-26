'use server'

import { redirect } from 'next/navigation'
import { ensureMethode } from '@/lib/methodes-db'
import { supprimerClassesParIds } from '@/lib/reset-classe'
import {
  executerCreationClasse,
  type CreationClasseDependances,
  type DonneesCreationClasse,
  type ParametresEnregistrementSource,
} from '@/lib/setup-creation'
import { createClient } from '@/lib/supabase/server'

export async function creerClasse(formData: DonneesCreationClasse) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')

  const dependances: CreationClasseDependances = {
    async lireAnciennesClasses(userId) {
      const { data, error } = await supabase
        .from('classes')
        .select('id')
        .eq('user_id', userId)
      if (error) {
        throw new Error(
          `Lecture de la configuration actuelle impossible : ${error.message}`,
        )
      }
      return (data ?? []).map(classe => classe.id)
    },

    async insererClasse(classe) {
      const { data, error } = await supabase
        .from('classes')
        .insert(classe)
        .select('id')
        .single()
      if (error || !data) {
        throw new Error(error?.message ?? 'Création de la classe impossible.')
      }
      return data.id
    },

    async insererEleves(eleves) {
      const { error } = await supabase.from('eleves').insert(eleves)
      if (error) throw new Error(`Enregistrement des élèves impossible : ${error.message}`)
    },

    async insererPeriodes(periodes) {
      const { error } = await supabase.from('periodes').insert(periodes)
      if (error) throw new Error(`Enregistrement des périodes impossible : ${error.message}`)
    },

    async insererSemaines(semaines) {
      const { error } = await supabase.from('semaines').insert(semaines)
      if (error) throw new Error(`Enregistrement des semaines impossible : ${error.message}`)
    },

    async assurerMethode(classeId, matiere, nomMethode) {
      return ensureMethode(supabase, classeId, matiere, nomMethode)
    },

    async enregistrerSource(params: ParametresEnregistrementSource) {
      const { data, error } = await supabase.rpc(
        'enregistrer_source_progression',
        params,
      )
      if (error) {
        throw new Error(
          `Enregistrement de ${params.p_nom_source} impossible : ${error.message}`,
        )
      }
      if (typeof data !== 'string' || !data) {
        throw new Error(
          `Enregistrement de ${params.p_nom_source} impossible : identifiant absent.`,
        )
      }
      return data
    },

    async insererEmploiDuTemps(creneaux) {
      const { error } = await supabase.from('emploi_du_temps').insert(creneaux)
      if (error) {
        throw new Error(`Enregistrement de l'emploi du temps impossible : ${error.message}`)
      }
    },

    async supprimerClasses(ids) {
      await supprimerClassesParIds(supabase, ids)
    },
  }

  await executerCreationClasse(formData, user.id, dependances)

  // Next.js 16 demande que redirect reste hors d un bloc try/catch.
  redirect('/accueil')
}
