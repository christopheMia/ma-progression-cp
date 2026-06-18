'use server'
import { createClient } from '@/lib/supabase/server'
import { genererProgression, genererProgressionFrancais } from '@/lib/progression'
import { supprimerClassesUtilisateur } from '@/lib/reset-classe'
import { getStatus } from '@/lib/semaines'
import { addWeeks, startOfWeek, format } from 'date-fns'
import { redirect } from 'next/navigation'

const PRENOMS = ['Lina', 'Tom', 'Aya', 'Noah', 'Jade', 'Sacha', 'Léa', 'Gabriel', 'Manon', 'Yanis']

const EDT: Array<{ jour: string; heure_debut: string; heure_fin: string; matiere: string }> = [
  // Lundi
  { jour: 'lundi', heure_debut: '08:30', heure_fin: '09:15', matiere: 'Lecture' },
  { jour: 'lundi', heure_debut: '09:15', heure_fin: '10:00', matiere: 'Écriture' },
  { jour: 'lundi', heure_debut: '10:15', heure_fin: '11:15', matiere: 'Mathématiques' },
  { jour: 'lundi', heure_debut: '13:30', heure_fin: '14:15', matiere: 'Explorer le monde' },
  { jour: 'lundi', heure_debut: '14:15', heure_fin: '15:00', matiere: 'EPS' },
  // Mardi
  { jour: 'mardi', heure_debut: '08:30', heure_fin: '09:15', matiere: 'Lecture' },
  { jour: 'mardi', heure_debut: '09:15', heure_fin: '10:00', matiere: 'Écriture' },
  { jour: 'mardi', heure_debut: '10:15', heure_fin: '11:15', matiere: 'Mathématiques' },
  { jour: 'mardi', heure_debut: '13:30', heure_fin: '14:30', matiere: 'Arts plastiques' },
  // Jeudi
  { jour: 'jeudi', heure_debut: '08:30', heure_fin: '09:15', matiere: 'Lecture' },
  { jour: 'jeudi', heure_debut: '09:15', heure_fin: '10:00', matiere: 'Écriture' },
  { jour: 'jeudi', heure_debut: '10:15', heure_fin: '11:15', matiere: 'Mathématiques' },
  { jour: 'jeudi', heure_debut: '13:30', heure_fin: '14:15', matiere: 'Explorer le monde' },
  { jour: 'jeudi', heure_debut: '14:15', heure_fin: '15:00', matiere: 'Éducation musicale' },
  // Vendredi
  { jour: 'vendredi', heure_debut: '08:30', heure_fin: '09:15', matiere: 'Lecture' },
  { jour: 'vendredi', heure_debut: '09:15', heure_fin: '10:00', matiere: 'Écriture' },
  { jour: 'vendredi', heure_debut: '10:15', heure_fin: '11:15', matiere: 'Mathématiques' },
  { jour: 'vendredi', heure_debut: '13:30', heure_fin: '14:15', matiere: 'EMC' },
  { jour: 'vendredi', heure_debut: '14:15', heure_fin: '15:00', matiere: 'EPS' },
]

/**
 * Crée une classe de DÉMONSTRATION entièrement pré-remplie (élèves, emploi du temps,
 * progression des 36 semaines, suivi déjà renseigné) pour montrer l'outil « en vrai ».
 * ⚠️ Remplace la configuration existante de l'utilisateur.
 */
export async function chargerClasseDemo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')

  await supprimerClassesUtilisateur(supabase, user.id)

  // Rentrée placée ~11 semaines avant aujourd'hui : l'année est « en cours »
  const rentree = format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -11), 'yyyy-MM-dd')

  const { data: classe } = await supabase.from('classes')
    .insert({ user_id: user.id, manuel_id: 'lecture-piano', rentree_date: rentree })
    .select().single()
  if (!classe) throw new Error('Erreur création classe démo')

  const { data: eleves } = await supabase.from('eleves')
    .insert(PRENOMS.map((prenom, i) => ({ class_id: classe.id, prenom, ordre: i })))
    .select()

  await supabase.from('emploi_du_temps')
    .insert(EDT.map((c, i) => ({ ...c, class_id: classe.id, ordre: i })))

  const progression = genererProgression('lecture-piano', rentree)
  const { data: semaines } = await supabase.from('semaines')
    .insert(progression.map(s => ({ ...s, class_id: classe.id })))
    .select()

  // Peuple aussi la table `progression` (français) pour exercer le vrai chemin
  // d'affichage par matière (la fiche semaine lit `progression`).
  const progFr = genererProgressionFrancais('lecture-piano')
  if (progFr.length > 0) {
    await supabase.from('progression').insert(
      progFr.map(p => ({ ...p, class_id: classe.id, matiere: 'francais' as const }))
    )
  }

  // Suivi pré-rempli pour les semaines passées et en cours
  const acquisitions: Array<{ semaine_id: string; eleve_id: string; matiere: string; grapheme: string; acquis: boolean }> = []
  for (const s of semaines ?? []) {
    const statut = getStatus(s)
    if (statut === 'upcoming') continue
    const ratio = statut === 'current' ? 0.5 : 0.85
    for (const e of eleves ?? []) {
      for (const g of s.graphemes) {
        if (Math.random() < ratio) {
          acquisitions.push({ semaine_id: s.id, eleve_id: e.id, matiere: 'francais', grapheme: g, acquis: true })
        }
      }
    }
  }
  if (acquisitions.length) await supabase.from('acquisitions').insert(acquisitions)

  redirect('/accueil')
}
