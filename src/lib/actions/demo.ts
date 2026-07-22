'use server'
import { createClient } from '@/lib/supabase/server'
import { genererProgression, genererProgressionFrancais } from '@/lib/progression'
import { supprimerClassesParIds } from '@/lib/reset-classe'
import { getStatus } from '@/lib/semaines'
import { redirect } from 'next/navigation'
import { ensureMethode } from '@/lib/methodes-db'
import { periodesOfficielles } from '@/lib/calendrier-officiel'
import { datesSemainesCalendaires } from '@/lib/calendrier-semaines'

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

  // Comme pour le setup, la classe actuelle reste intacte tant que la classe
  // de demonstration n'est pas completement construite.
  const { data: anciennesClasses, error: anciennesError } = await supabase
    .from('classes').select('id').eq('user_id', user.id)
  if (anciennesError) throw new Error(`Lecture de la configuration actuelle impossible : ${anciennesError.message}`)
  const anciensIds = (anciennesClasses ?? []).map(c => c.id)

  const maintenant = new Date()
  const anneeRentree = maintenant.getMonth() >= 7
    ? maintenant.getFullYear()
    : maintenant.getFullYear() - 1
  const rentree = `${anneeRentree}-09-01`
  const periodes = periodesOfficielles(rentree, 'A')
  if (periodes.length !== 5) throw new Error('Calendrier de démonstration indisponible pour cette année.')

  const { data: classe, error: classeError } = await supabase.from('classes')
    .insert({ user_id: user.id, manuel_id: 'lecture-piano', rentree_date: rentree, zone_scolaire: 'A' })
    .select().single()
  if (classeError || !classe) throw new Error(`Erreur création classe démo : ${classeError?.message ?? 'réponse vide'}`)

  try {
    const { error: periodesError } = await supabase.from('periodes')
      .insert(periodes.map(p => ({ ...p, class_id: classe.id })))
    if (periodesError) throw new Error(`Création des périodes de démonstration impossible : ${periodesError.message}`)

    const { data: eleves, error: elevesError } = await supabase.from('eleves')
      .insert(PRENOMS.map((prenom, i) => ({ class_id: classe.id, prenom, ordre: i })))
      .select()
    if (elevesError || !eleves) {
      throw new Error(`Création des élèves de démonstration impossible : ${elevesError?.message ?? 'réponse vide'}`)
    }

    const { error: edtError } = await supabase.from('emploi_du_temps')
      .insert(EDT.map((c, i) => ({ ...c, class_id: classe.id, ordre: i })))
    if (edtError) throw new Error(`Création de l'emploi du temps de démonstration impossible : ${edtError.message}`)

    const progression = genererProgression('lecture-piano', rentree)
    const calendrier = datesSemainesCalendaires(periodes, progression.length)
    const parNumero = new Map(calendrier.map(s => [s.numero, s]))
    const { data: semaines, error: semainesError } = await supabase.from('semaines')
      .insert(progression.map(s => ({
        ...s,
        class_id: classe.id,
        date_debut: parNumero.get(s.numero)?.date_debut ?? s.date_debut,
        periode_numero: parNumero.get(s.numero)?.periode_numero ?? null,
      })))
      .select()
    if (semainesError || !semaines) {
      throw new Error(`Création des semaines de démonstration impossible : ${semainesError?.message ?? 'réponse vide'}`)
    }

    // Peuple aussi la table `progression` (français) pour exercer le vrai chemin
    // d'affichage par matière (la fiche semaine lit `progression`).
    const progFr = genererProgressionFrancais('lecture-piano')
    if (progFr.length > 0) {
      const methodeId = await ensureMethode(supabase, classe.id, 'francais')
      const { error } = await supabase.from('progression').insert(
        progFr.map(p => ({ ...p, class_id: classe.id, methode_id: methodeId, matiere: 'francais' as const }))
      )
      if (error) throw new Error(`Création de la progression de démonstration impossible : ${error.message}`)
    }

    // Suivi pré-rempli pour les semaines passées et en cours
    const acquisitions: Array<{ semaine_id: string; eleve_id: string; matiere: string; grapheme: string; acquis: boolean }> = []
    for (const s of semaines) {
      const statut = getStatus(s)
      if (statut === 'upcoming') continue
      const ratio = statut === 'current' ? 0.5 : 0.85
      for (const e of eleves) {
        for (const g of s.graphemes) {
          if (Math.random() < ratio) {
            acquisitions.push({ semaine_id: s.id, eleve_id: e.id, matiere: 'francais', grapheme: g, acquis: true })
          }
        }
      }
    }
    if (acquisitions.length) {
      const { error } = await supabase.from('acquisitions').insert(acquisitions)
      if (error) throw new Error(`Création du suivi de démonstration impossible : ${error.message}`)
    }
  } catch (error) {
    await supprimerClassesParIds(supabase, [classe.id])
    throw error
  }

  await supprimerClassesParIds(supabase, anciensIds)

  redirect('/accueil')
}
