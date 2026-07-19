'use server'
import { createClient } from '@/lib/supabase/server'
import { genererProgression, genererProgressionFrancais } from '@/lib/progression'
import { addWeeks, format } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supprimerClassesUtilisateur } from '@/lib/reset-classe'
import type { ProgressionSemaine } from '@/data/manuels'
import { TRAME_EDT_CP } from '@/data/trame-edt'
import { genererEdtCP } from '@/lib/edt-generator'
import { ensureMethode } from '@/lib/methodes-db'

type Creneau = { jour: string; heure_debut: string; heure_fin: string; matiere: string; ordre: number; couleur: string | null; type: 'cours' | 'routine'; visible_journal: boolean }

async function getClasse() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')
  const { data: classe } = await supabase.from('classes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!classe) throw new Error('Classe introuvable')
  return { supabase, classe }
}

/** Enregistre le prénom de l'enseignant (pour le « Bonjour … » et l'assistant IA). */
export async function updatePrenomEnseignant(prenom: string) {
  const { supabase, classe } = await getClasse()
  await supabase.from('classes').update({ prenom_enseignant: prenom.trim() || null }).eq('id', classe.id)
  revalidatePath('/accueil')
  revalidatePath('/parametres')
}

/**
 * Met à jour la liste des élèves en préservant le suivi des élèves conservés.
 * Identité par prénom : on garde ceux dont le prénom existe encore (donc leurs acquisitions),
 * on insère les nouveaux, on supprime ceux retirés (et leurs acquisitions).
 */
export async function updateEleves(prenoms: string[]) {
  const { supabase, classe } = await getClasse()
  const noms = prenoms.map(p => p.trim()).filter(Boolean)

  const { data: existants } = await supabase.from('eleves').select('*').eq('class_id', classe.id)
  const existingNames = new Set((existants ?? []).map(e => e.prenom))

  const supprimes = (existants ?? []).filter(e => !noms.includes(e.prenom))
  if (supprimes.length) {
    const ids = supprimes.map(e => e.id)
    await supabase.from('acquisitions').delete().in('eleve_id', ids)
    await supabase.from('eleves').delete().in('id', ids)
  }

  const nouveaux = noms.filter(p => !existingNames.has(p))
  if (nouveaux.length) {
    await supabase.from('eleves').insert(nouveaux.map(prenom => ({ class_id: classe.id, prenom, ordre: 0 })))
  }

  // Réordonne selon l'ordre saisi
  const { data: tous } = await supabase.from('eleves').select('*').eq('class_id', classe.id)
  const byName = new Map((tous ?? []).map(e => [e.prenom, e]))
  for (let i = 0; i < noms.length; i++) {
    const e = byName.get(noms[i])
    if (e && e.ordre !== i) await supabase.from('eleves').update({ ordre: i }).eq('id', e.id)
  }

  revalidatePath('/parametres')
  revalidatePath('/planning')
}

/** Remplace l'emploi du temps (sans impact sur la progression ni les journaux déjà enregistrés). */
export async function updateEmploiDuTemps(creneaux: Omit<Creneau, 'ordre'>[]) {
  const { supabase, classe } = await getClasse()
  await supabase.from('emploi_du_temps').delete().eq('class_id', classe.id)
  if (creneaux.length) {
    await supabase.from('emploi_du_temps').insert(
      creneaux.map((c, i) => ({ ...c, class_id: classe.id, ordre: i }))
    )
  }
  revalidatePath('/parametres')
}

/**
 * Génère l'emploi du temps depuis le volume horaire officiel CP (remplace l'EDT
 * courant). Reste 100% modifiable ensuite. codeRenforce garantit un bloc code
 * chaque matin.
 */
export async function genererEmploiDuTemps(codeRenforce = true) {
  const { supabase, classe } = await getClasse()
  await supabase.from('emploi_du_temps').delete().eq('class_id', classe.id)
  const edt = genererEdtCP(codeRenforce)
  await supabase.from('emploi_du_temps').insert(
    edt.map(c => ({
      class_id: classe.id,
      jour: c.jour,
      heure_debut: c.heure_debut,
      heure_fin: c.heure_fin,
      matiere: c.matiere,
      type: c.type,
      couleur: c.couleur,
      ordre: c.ordre,
    }))
  )
  revalidatePath('/parametres')
  revalidatePath('/planning')
}

/** Repart de la trame CP par défaut (efface l'EDT courant). */
export async function rechargerEmploiDuTempsType() {
  const { supabase, classe } = await getClasse()
  await supabase.from('emploi_du_temps').delete().eq('class_id', classe.id)
  if (TRAME_EDT_CP.length) {
    await supabase.from('emploi_du_temps').insert(TRAME_EDT_CP.map(c => ({ ...c, class_id: classe.id })))
  }
  revalidatePath('/parametres')
}

/**
 * Change la date de rentrée et recalcule la date de chaque semaine existante,
 * EN CONSERVANT les semaines (donc le suivi des élèves et les cahiers journaux).
 */
export async function updateRentreeDate(newDate: string) {
  const { supabase, classe } = await getClasse()
  await supabase.from('classes').update({ rentree_date: newDate }).eq('id', classe.id)

  const { data: semaines } = await supabase.from('semaines').select('id, numero').eq('class_id', classe.id)
  const debut = new Date(newDate)
  for (const s of semaines ?? []) {
    const d = format(addWeeks(debut, s.numero - 1), 'yyyy-MM-dd')
    await supabase.from('semaines').update({ date_debut: d }).eq('id', s.id)
  }

  revalidatePath('/parametres')
  revalidatePath('/planning')
}

/**
 * Change le manuel : ⚠️ régénère toute la progression annuelle.
 * Supprime les semaines existantes (et donc le suivi des élèves + cahiers journaux).
 */
export async function updateManuel(manuelId: string, customProgression?: ProgressionSemaine[]) {
  const { supabase, classe } = await getClasse()

  const { data: semaines } = await supabase.from('semaines').select('id').eq('class_id', classe.id)
  const ids = (semaines ?? []).map(s => s.id)
  if (ids.length) {
    await supabase.from('acquisitions').delete().in('semaine_id', ids)
    await supabase.from('cahier_journal').delete().in('semaine_id', ids)
    await supabase.from('semaines').delete().in('id', ids)
  }

  await supabase.from('classes').update({ manuel_id: manuelId }).eq('id', classe.id)

  const progression = genererProgression(manuelId, classe.rentree_date, customProgression)
  await supabase.from('semaines').insert(progression.map(s => ({ ...s, class_id: classe.id })))

  // Régénère aussi la table `progression` (lue par la fiche semaine) pour le
  // français : on remplace UNIQUEMENT le français, le maths importé est préservé.
  await supabase.from('progression').delete().eq('class_id', classe.id).eq('matiere', 'francais')
  const progFr = genererProgressionFrancais(manuelId, customProgression)
  if (progFr.length > 0) {
    const methodeId = await ensureMethode(supabase, classe.id, 'francais')
    await supabase.from('progression').insert(
      progFr.map(p => ({ ...p, class_id: classe.id, methode_id: methodeId, matiere: 'francais' as const }))
    )
  }

  revalidatePath('/parametres')
  revalidatePath('/planning')
}

/**
 * Remet à zéro UN bloc de la classe (utile à chaque nouvelle année), sans tout
 * supprimer :
 *  - 'eleves'   : efface tous les élèves et leur suivi (acquisitions, bilans).
 *  - 'edt'      : réinitialise l'emploi du temps à la trame CP par défaut.
 *  - 'methodes' : efface les méthodes importées et leur progression.
 *  - 'suivi'    : efface le suivi des élèves (étoiles + bilans), garde les élèves.
 *  - 'journaux' : efface tous les cahiers journaux.
 */
export async function reinitialiserBloc(
  scope: 'eleves' | 'edt' | 'methodes' | 'suivi' | 'journaux',
) {
  const { supabase, classe } = await getClasse()
  const classId = classe.id

  if (scope === 'eleves') {
    const { data: eleves } = await supabase.from('eleves').select('id').eq('class_id', classId)
    const ids = (eleves ?? []).map(e => e.id)
    if (ids.length) {
      await supabase.from('acquisitions').delete().in('eleve_id', ids)
      await supabase.from('appreciations').delete().in('eleve_id', ids)
      await supabase.from('eleves').delete().in('id', ids)
    }
  } else if (scope === 'edt') {
    await supabase.from('emploi_du_temps').delete().eq('class_id', classId)
    if (TRAME_EDT_CP.length) {
      await supabase.from('emploi_du_temps').insert(TRAME_EDT_CP.map(c => ({ ...c, class_id: classId })))
    }
  } else if (scope === 'methodes') {
    await supabase.from('progression').delete().eq('class_id', classId)
    await supabase.from('methodes').delete().eq('class_id', classId)
  } else if (scope === 'suivi' || scope === 'journaux') {
    const { data: semaines } = await supabase.from('semaines').select('id').eq('class_id', classId)
    const sids = (semaines ?? []).map(s => s.id)
    if (sids.length) {
      if (scope === 'suivi') {
        await supabase.from('acquisitions').delete().in('semaine_id', sids)
        await supabase.from('appreciations').delete().in('semaine_id', sids)
      } else {
        await supabase.from('cahier_journal').delete().in('semaine_id', sids)
      }
    }
  }

  revalidatePath('/parametres')
  revalidatePath('/planning')
  revalidatePath('/accueil')
}

/**
 * Réinitialise TOUTE la configuration : supprime la classe et toutes ses données
 * (semaines, suivi des élèves, cahiers journaux, élèves, emploi du temps),
 * puis renvoie vers l'assistant de configuration. ⚠️ Irréversible.
 */
export async function reinitialiserConfiguration() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')

  await supprimerClassesUtilisateur(supabase, user.id)

  revalidatePath('/planning')
  revalidatePath('/parametres')
  redirect('/setup')
}
