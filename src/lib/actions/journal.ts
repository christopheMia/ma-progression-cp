'use server'
import { createClient } from '@/lib/supabase/server'
import { genererCahierJournal } from '@/lib/cahier-journal'
import { JourJournal } from '@/types'
import { revalidatePath } from 'next/cache'

export async function genererOuChargerJournal(semaineId: string) {
  const supabase = await createClient()

  const { data: semaine } = await supabase.from('semaines').select('*').eq('id', semaineId).single()
  if (!semaine) throw new Error('Semaine introuvable')

  const { data: existing } = await supabase.from('cahier_journal').select('*').eq('semaine_id', semaineId).single()
  if (existing) return existing.contenu as JourJournal[]

  const { data: edt } = await supabase.from('emploi_du_temps').select('*').eq('class_id', semaine.class_id)
  const { data: progression } = await supabase
    .from('progression').select('methode_id, matiere, items, pages, mots_exemple')
    .eq('class_id', semaine.class_id).eq('numero', semaine.numero)

  const contenu = genererCahierJournal(edt ?? [], progression ?? [])
  await supabase.from('cahier_journal').insert({ semaine_id: semaineId, contenu })
  return contenu
}

export async function sauvegarderJournal(semaineId: string, contenu: JourJournal[]) {
  const supabase = await createClient()
  await supabase.from('cahier_journal')
    .upsert({ semaine_id: semaineId, contenu, updated_at: new Date().toISOString() }, { onConflict: 'semaine_id' })
  revalidatePath(`/semaine/${semaineId}`)
}

/**
 * Régénère le cahier journal depuis l'emploi du temps et la progression
 * actuels, en écrasant la version en cache. Utile après avoir relié des
 * créneaux à une méthode ou importé une progression : le journal se remplit
 * alors avec le contenu à jour. Écrase le contenu existant de la semaine.
 */
export async function regenererJournal(semaineId: string) {
  const supabase = await createClient()

  const { data: semaine } = await supabase.from('semaines').select('*').eq('id', semaineId).single()
  if (!semaine) throw new Error('Semaine introuvable')

  const { data: edt } = await supabase.from('emploi_du_temps').select('*').eq('class_id', semaine.class_id)
  const { data: progression } = await supabase
    .from('progression').select('methode_id, matiere, items, pages, mots_exemple')
    .eq('class_id', semaine.class_id).eq('numero', semaine.numero)

  const contenu = genererCahierJournal(edt ?? [], progression ?? [])
  await supabase.from('cahier_journal')
    .upsert({ semaine_id: semaineId, contenu, updated_at: new Date().toISOString() }, { onConflict: 'semaine_id' })
  revalidatePath(`/semaine/${semaineId}`)
  return contenu
}
