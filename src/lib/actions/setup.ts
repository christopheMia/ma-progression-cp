'use server'
import { createClient } from '@/lib/supabase/server'
import { genererProgression, genererProgressionFrancais } from '@/lib/progression'
import { supprimerClassesParIds } from '@/lib/reset-classe'
import { redirect } from 'next/navigation'
import type { ProgressionSemaine } from '@/data/manuels'
import { TRAME_EDT_CP } from '@/data/trame-edt'
import { ensureMethode } from '@/lib/methodes-db'
import { periodesOfficielles, type ZoneScolaire } from '@/lib/calendrier-officiel'
import { datesSemainesCalendaires } from '@/lib/calendrier-semaines'

export async function creerClasse(formData: {
  manuelId: string
  rentreeDate: string
  zoneScolaire: ZoneScolaire
  eleves: string[]
  emploiDuTemps: Array<{ jour: string; heure_debut: string; heure_fin: string; matiere: string; ordre: number; couleur?: string | null; type?: 'cours' | 'routine' }>
  customProgression?: ProgressionSemaine[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')

  // On garde les anciennes classes tant que la nouvelle n'est pas entierement
  // construite. Un echec reseau au milieu du setup ne doit jamais effacer la
  // configuration qui fonctionnait encore quelques secondes plus tot.
  const { data: anciennesClasses, error: anciennesError } = await supabase
    .from('classes').select('id').eq('user_id', user.id)
  if (anciennesError) throw new Error(`Lecture de la configuration actuelle impossible : ${anciennesError.message}`)
  const anciensIds = (anciennesClasses ?? []).map(c => c.id)

  const { data: classe, error: classError } = await supabase
    .from('classes')
    .insert({
      user_id: user.id,
      manuel_id: formData.manuelId,
      rentree_date: formData.rentreeDate,
      zone_scolaire: formData.zoneScolaire,
    })
    .select().single()

  if (classError || !classe) throw new Error('Erreur création classe')

  try {
    const elevesData = (formData.eleves ?? []).map((prenom, i) => ({
      class_id: classe.id, prenom, ordre: i
    }))
    // Démarrage possible sans élèves : ils s'ajoutent ensuite dans Paramètres → Élèves.
    if (elevesData.length) {
      const { error } = await supabase.from('eleves').insert(elevesData)
      if (error) throw new Error(`Enregistrement des élèves impossible : ${error.message}`)
    }

    const periodes = periodesOfficielles(formData.rentreeDate, formData.zoneScolaire)
    if (periodes.length !== 5) {
      throw new Error('Le calendrier officiel de cette année scolaire n’est pas encore disponible dans l’application.')
    }
    const { error: periodesError } = await supabase.from('periodes').insert(
      periodes.map(p => ({ ...p, class_id: classe.id })),
    )
    if (periodesError) throw new Error(`Enregistrement des périodes impossible : ${periodesError.message}`)

    const progression = genererProgression(formData.manuelId, formData.rentreeDate, formData.customProgression)
    const calendrier = datesSemainesCalendaires(periodes, progression.length)
    if (calendrier.length !== progression.length) {
      throw new Error('Le calendrier scolaire ne contient pas assez de semaines de classe.')
    }
    const parNumero = new Map(calendrier.map(s => [s.numero, s]))
    const semainesData = progression.map(s => ({
      ...s,
      class_id: classe.id,
      date_debut: parNumero.get(s.numero)?.date_debut ?? s.date_debut,
      periode_numero: parNumero.get(s.numero)?.periode_numero ?? null,
    }))
    const { error: semainesError } = await supabase.from('semaines').insert(semainesData)
    if (semainesError) throw new Error(`Enregistrement des semaines impossible : ${semainesError.message}`)

    const progFr = genererProgressionFrancais(formData.manuelId, formData.customProgression)
    if (progFr.length > 0) {
      const methodeId = await ensureMethode(supabase, classe.id, 'francais')
      const { error } = await supabase.from('progression').insert(
        progFr.map(p => ({ ...p, class_id: classe.id, methode_id: methodeId, matiere: 'francais' as const }))
      )
      if (error) throw new Error(`Enregistrement de la progression impossible : ${error.message}`)
    }

    const source = formData.emploiDuTemps.length > 0
      ? formData.emploiDuTemps.map(c => ({
          jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin,
          matiere: c.matiere, ordre: c.ordre, couleur: c.couleur ?? null, type: c.type ?? 'cours' as const,
        }))
      : TRAME_EDT_CP
    const { error: edtError } = await supabase
      .from('emploi_du_temps').insert(source.map(c => ({ ...c, class_id: classe.id })))
    if (edtError) throw new Error(`Enregistrement de l'emploi du temps impossible : ${edtError.message}`)
  } catch (error) {
    // La nouvelle classe est incomplete. On la retire, les anciennes sont
    // encore intactes et restent la source de verite.
    await supprimerClassesParIds(supabase, [classe.id])
    throw error
  }

  // La nouvelle configuration est complete. Les anciennes peuvent maintenant
  // etre supprimees sans risque pour les donnees de l'utilisateur.
  await supprimerClassesParIds(supabase, anciensIds)

  redirect('/accueil')
}
