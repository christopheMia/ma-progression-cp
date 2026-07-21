'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ensureMethode } from '@/lib/methodes-db'
import {
  repartirProgrammation,
  type PeriodeProgrammation,
} from '@/lib/repartition-periode'

/** Semaines de la classe rattachees a une periode, lues en base. */
async function semainesParPeriode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classeId: string,
): Promise<Map<number, number[]>> {
  const { data, error } = await supabase
    .from('semaines').select('numero, periode_numero')
    .eq('class_id', classeId)
    .not('periode_numero', 'is', null)
  if (error) throw new Error(error.message)

  const parPeriode = new Map<number, number[]>()
  for (const s of data ?? []) {
    const p = s.periode_numero as number
    parPeriode.set(p, [...(parPeriode.get(p) ?? []), s.numero as number])
  }
  if (!parPeriode.size) {
    throw new Error(
      'Tes semaines ne sont pas encore rattachées aux périodes. '
      + 'Utilise « Caler sur le calendrier » dans les paramètres, puis relance l\'import.'
    )
  }
  return parPeriode
}

/** Classe courante de l'utilisateur connecte. */
async function classeCourante(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')
  const { data: classe } = await supabase
    .from('classes').select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle()
  if (!classe) throw new Error('Aucune classe')
  return classe
}

/**
 * Repartit SANS RIEN ECRIRE, pour que l'enseignante voie le resultat semaine
 * par semaine et puisse le corriger avant d'enregistrer. La repartition a
 * besoin des vraies semaines de la classe, donc elle ne peut pas se faire
 * cote navigateur.
 */
export async function previsualiserProgrammation(periodes: PeriodeProgrammation[]) {
  const supabase = await createClient()
  const classe = await classeCourante(supabase)
  const parPeriode = await semainesParPeriode(supabase, classe.id)

  const { semaines, periodesIgnorees } = repartirProgrammation(periodes, parPeriode)
  return {
    semaines: semaines
      .filter(s => s.items.length > 0)
      .map(s => ({ numero: s.numero, items: s.items, pages: '', mots_exemple: [] })),
    periodesIgnorees,
  }
}

/**
 * Enregistre une PROGRAMMATION ANNUELLE PAR PERIODE en la repartissant sur les
 * vraies semaines de la classe.
 *
 * Le document d'entree ne parle pas de semaines : il donne, pour chaque periode
 * et chaque domaine, la liste des apprentissages (format des programmations
 * d'editeur, ex. "Maths en CP" chez Acces). C'est l'application qui etale ce
 * contenu sur les semaines reelles de la periode, dont le nombre varie de 5 a 8
 * selon l'annee et la zone : il est donc LU EN BASE, jamais suppose.
 */
export async function enregistrerProgrammationAnnuelle(
  matiere: string,
  periodes: PeriodeProgrammation[],
  nomManuel?: string,
) {
  const trimmed = matiere.trim()
  if (!trimmed) throw new Error('Matière inconnue')
  matiere = trimmed

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')

  const { data: classe } = await supabase
    .from('classes').select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle()
  if (!classe) throw new Error('Aucune classe')

  // Les vraies semaines de chaque periode, telles que la classe les a calees.
  const { data: semaines, error: erreurSemaines } = await supabase
    .from('semaines').select('numero, periode_numero')
    .eq('class_id', classe.id)
    .not('periode_numero', 'is', null)
  if (erreurSemaines) throw new Error(erreurSemaines.message)

  const parPeriode = new Map<number, number[]>()
  for (const s of semaines ?? []) {
    const p = s.periode_numero as number
    parPeriode.set(p, [...(parPeriode.get(p) ?? []), s.numero as number])
  }

  if (!parPeriode.size) {
    throw new Error(
      'Tes semaines ne sont pas encore rattachées aux périodes. '
      + 'Utilise « Caler sur le calendrier » dans les paramètres, puis relance l\'import.'
    )
  }

  const { semaines: reparties, periodesIgnorees } = repartirProgrammation(periodes, parPeriode)
  if (!reparties.length) {
    throw new Error('Aucun apprentissage n\'a pu être placé : le document semble vide.')
  }

  // La methode AVANT l'effacement : si sa creation echoue, on ne veut pas avoir
  // deja detruit la progression existante (incident du 20/07).
  const methodeId = await ensureMethode(supabase, classe.id, matiere, nomManuel)

  const { error: erreurEffacement } = await supabase.from('progression').delete()
    .eq('class_id', classe.id).eq('matiere', matiere)
  if (erreurEffacement) throw new Error(erreurEffacement.message)

  const lignes = reparties
    .filter(s => s.items.length > 0)
    .map(s => ({
      class_id: classe.id,
      methode_id: methodeId,
      matiere,
      numero: s.numero,
      items: s.items,
      pages: null,
      mots_exemple: null,
    }))

  const { error } = await supabase.from('progression').insert(lignes)
  if (error) throw new Error(error.message)

  revalidatePath('/planning')
  revalidatePath('/accueil')

  return {
    semainesRemplies: lignes.length,
    periodesTraitees: periodes.length - periodesIgnorees.length,
    periodesIgnorees,
  }
}
