'use server'
import { createClient } from '@/lib/supabase/server'
import { genererCahierJournal } from '@/lib/cahier-journal'
import { validerContenuJournal } from '@/lib/cahier-journal-edition'
import { resultat, type Resultat } from '@/lib/resultat'
import { JourJournal } from '@/types'
import { revalidatePath } from 'next/cache'

// Ces actions RENVOIENT leur message d'erreur au lieu de le lever : en
// production, Next.js efface le texte d'une erreur levee dans une action
// serveur et l'enseignant ne lit qu'un digest. Voir `src/lib/resultat.ts`.

async function contexteJournal(semaineId: string) {
  if (!semaineId || typeof semaineId !== 'string') {
    throw new Error('Semaine introuvable.')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tu dois être connecté pour modifier le cahier journal.')

  const { data: semaine, error } = await supabase
    .from('semaines')
    .select('id, class_id, numero')
    .eq('id', semaineId)
    .single()

  if (error || !semaine) throw new Error('Semaine introuvable ou non autorisée.')
  return { supabase, semaine }
}

/**
 * Lit le cahier journal déjà enregistré, sans jamais en créer.
 *
 * Sert à réafficher la semaine quand l'enseignante y revient. Le composant
 * partait d'un état vide et ne rechargeait rien : en changeant d'onglet elle
 * retrouvait le bouton « Générer le cahier journal », comme si son travail
 * avait disparu. Il ne disparaissait pas, il n'était simplement jamais relu.
 *
 * La distinction avec `genererOuChargerJournal` est le point important : celle-ci
 * ne DOIT PAS créer. Créer au simple affichage figerait une photo du journal
 * pour chacune des 36 semaines dès qu'on les survole, alors qu'une semaine
 * jamais ouverte doit continuer de suivre l'emploi du temps et les progressions.
 */
export async function lireJournal(semaineId: string): Promise<Resultat<JourJournal[] | null>> {
  return resultat(async () => {
    const { supabase } = await contexteJournal(semaineId)

    const { data, error } = await supabase
      .from('cahier_journal')
      .select('contenu')
      .eq('semaine_id', semaineId)
      .maybeSingle()
    if (error) throw new Error('Le cahier journal n’a pas pu être chargé.')
    return data ? validerContenuJournal(data.contenu) : null
  }, 'Le cahier journal n’a pas pu être chargé.')
}

export async function genererOuChargerJournal(semaineId: string): Promise<Resultat<JourJournal[]>> {
  return resultat(async () => {
    const { supabase, semaine } = await contexteJournal(semaineId)

    const { data: existing, error: existingError } = await supabase
      .from('cahier_journal')
      .select('contenu')
      .eq('semaine_id', semaineId)
      .maybeSingle()
    if (existingError) throw new Error('Le cahier journal n’a pas pu être chargé.')
    if (existing) return validerContenuJournal(existing.contenu)

    const [{ data: edt, error: edtError }, { data: progression, error: progressionError }] = await Promise.all([
      supabase.from('emploi_du_temps').select('*').eq('class_id', semaine.class_id),
      supabase.from('progression').select('methode_id, matiere, items, pages, mots_exemple')
      .eq('class_id', semaine.class_id).eq('numero', semaine.numero),
    ])
    if (edtError || progressionError) {
      throw new Error('Les données nécessaires au cahier journal n’ont pas pu être chargées.')
    }

    const contenu = genererCahierJournal(edt ?? [], progression ?? [])
    const { error: insertError } = await supabase
      .from('cahier_journal')
      .insert({ semaine_id: semaineId, contenu })
    if (insertError) throw new Error('Le cahier journal n’a pas pu être créé.')
    return contenu
  }, 'Le cahier journal n’a pas pu être ouvert.')
}

export async function sauvegarderJournal(
  semaineId: string,
  contenu: JourJournal[],
): Promise<Resultat<void>> {
  return resultat(async () => {
    const contenuValide = validerContenuJournal(contenu)
    const { supabase } = await contexteJournal(semaineId)
    const { error } = await supabase.from('cahier_journal')
      .upsert(
        {
          semaine_id: semaineId,
          contenu: contenuValide,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'semaine_id' },
      )
    if (error) throw new Error('Le cahier journal n’a pas pu être enregistré.')
    revalidatePath(`/semaine/${semaineId}`)
  }, 'Le cahier journal n’a pas pu être enregistré.')
}

/**
 * Régénère le cahier journal depuis l'emploi du temps et la progression
 * actuels, en écrasant la version en cache. Utile après avoir relié des
 * créneaux à une méthode ou importé une progression : le journal se remplit
 * alors avec le contenu à jour. Écrase le contenu existant de la semaine.
 */
export async function regenererJournal(semaineId: string): Promise<Resultat<JourJournal[]>> {
  return resultat(async () => {
    const { supabase, semaine } = await contexteJournal(semaineId)

    const [{ data: edt, error: edtError }, { data: progression, error: progressionError }] = await Promise.all([
      supabase.from('emploi_du_temps').select('*').eq('class_id', semaine.class_id),
      supabase.from('progression').select('methode_id, matiere, items, pages, mots_exemple')
      .eq('class_id', semaine.class_id).eq('numero', semaine.numero),
    ])
    if (edtError || progressionError) {
      throw new Error('Les données nécessaires au cahier journal n’ont pas pu être chargées.')
    }

    const contenu = genererCahierJournal(edt ?? [], progression ?? [])
    const { error } = await supabase.from('cahier_journal')
      .upsert({ semaine_id: semaineId, contenu, updated_at: new Date().toISOString() }, { onConflict: 'semaine_id' })
    if (error) throw new Error('Le cahier journal n’a pas pu être régénéré.')
    revalidatePath(`/semaine/${semaineId}`)
    return contenu
  }, 'Le cahier journal n’a pas pu être régénéré.')
}
