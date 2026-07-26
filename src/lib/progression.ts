import { addWeeks, format } from 'date-fns'
import { LECTURE_PIANO } from '@/data/manuels/lecture-piano'
import { ProgressionSemaine } from '@/data/manuels'
import { Semaine } from '@/types'

// Seule progression « écrite » conservée : sert UNIQUEMENT au mode démonstration
// (les enseignants importent leur méthode via l'IA → manuelId 'custom').
const MANUELS_DATA = {
  'lecture-piano': LECTURE_PIANO,
}

/** Base commune : une annee complete, avant tout apport de methode. */
export function genererSqueletteSemaines(rentreeDate: string): Omit<Semaine, 'id' | 'class_id'>[] {
  const debut = new Date(rentreeDate)

  return Array.from({ length: 36 }, (_, i) => {
    const dateDebut = addWeeks(debut, i)

    return {
      numero: i + 1,
      date_debut: format(dateDebut, 'yyyy-MM-dd'),
      graphemes: [],
      // Ces deux colonnes historiques restent obligatoires en base. Elles restent
      // vides : les contenus viennent uniquement des progressions enregistrées.
      edm_theme: '',
      edm_competences: '',
      manuel_pages: null,
      mots_exemple: null,
      note: null,
    }
  })
}

export function genererProgression(
  manuelId: string,
  rentreeDate: string,
  customProgression?: ProgressionSemaine[]
): Omit<Semaine, 'id' | 'class_id'>[] {
  const semaines = customProgression ?? MANUELS_DATA[manuelId as keyof typeof MANUELS_DATA]?.semaines
  if (!semaines) throw new Error(`Manuel inconnu : ${manuelId}`)

  return genererSqueletteSemaines(rentreeDate).map((semaine, i) => {
    const semManuel = semaines[i]

    return {
      ...semaine,
      graphemes: semManuel?.items ?? [],
      manuel_pages: semManuel?.pages ?? null,
      mots_exemple: semManuel?.mots_exemple ?? null,
    }
  })
}

export function genererProgressionFrancais(
  manuelId: string,
  customProgression?: ProgressionSemaine[],
): Array<{ numero: number; items: string[]; pages: string | null; mots_exemple: string[] | null }> {
  const semaines = customProgression ?? MANUELS_DATA[manuelId as keyof typeof MANUELS_DATA]?.semaines
  if (!semaines) return []
  return semaines.slice(0, 36).map((s, i) => ({
    numero: i + 1,
    items: s.items,
    pages: s.pages || null,
    mots_exemple: s.mots_exemple ?? null,
  }))
}
