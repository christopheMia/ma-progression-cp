'use server'
import { createClient } from '@/lib/supabase/server'
import { genererProgression, genererProgressionFrancais } from '@/lib/progression'
import { supprimerClassesUtilisateur } from '@/lib/reset-classe'
import { redirect } from 'next/navigation'
import type { ProgressionSemaine } from '@/data/manuels'
import { TRAME_EDT_CP } from '@/data/trame-edt'

export async function creerClasse(formData: {
  manuelId: string
  rentreeDate: string
  eleves: string[]
  emploiDuTemps: Array<{ jour: string; heure_debut: string; heure_fin: string; matiere: string; ordre: number; couleur?: string | null; type?: 'cours' | 'routine' }>
  customProgression?: ProgressionSemaine[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')

  // Évite l'accumulation de classes en double : on repart d'une base propre
  await supprimerClassesUtilisateur(supabase, user.id)

  const { data: classe, error: classError } = await supabase
    .from('classes')
    .insert({ user_id: user.id, manuel_id: formData.manuelId, rentree_date: formData.rentreeDate })
    .select().single()

  if (classError || !classe) throw new Error('Erreur création classe')

  const elevesData = (formData.eleves ?? []).map((prenom, i) => ({
    class_id: classe.id, prenom, ordre: i
  }))
  // Démarrage possible sans élèves : ils s'ajoutent ensuite dans Paramètres → Élèves.
  if (elevesData.length) await supabase.from('eleves').insert(elevesData)

  const progression = genererProgression(formData.manuelId, formData.rentreeDate, formData.customProgression)
  const semainesData = progression.map(s => ({ ...s, class_id: classe.id }))
  await supabase.from('semaines').insert(semainesData)

  const progFr = genererProgressionFrancais(formData.manuelId, formData.customProgression)
  if (progFr.length > 0) {
    await supabase.from('progression').insert(
      progFr.map(p => ({ ...p, class_id: classe.id, matiere: 'francais' as const }))
    )
  }

  const source = formData.emploiDuTemps.length > 0
    ? formData.emploiDuTemps.map(c => ({
        jour: c.jour, heure_debut: c.heure_debut, heure_fin: c.heure_fin,
        matiere: c.matiere, ordre: c.ordre, couleur: c.couleur ?? null, type: c.type ?? 'cours' as const,
      }))
    : TRAME_EDT_CP
  await supabase.from('emploi_du_temps').insert(source.map(c => ({ ...c, class_id: classe.id })))

  redirect('/accueil')
}
