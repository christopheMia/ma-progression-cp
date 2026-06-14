import { addWeeks, format } from 'date-fns'
import { LECTURE_PIANO } from '@/data/manuels/lecture-piano'
import { EDM_PROGRESSION_CP } from '@/data/edm/progression-cp'
import { ProgressionSemaine } from '@/data/manuels'
import { Semaine } from '@/types'

// Seule progression « écrite » conservée : sert UNIQUEMENT au mode démonstration
// (les enseignants importent leur méthode via l'IA → manuelId 'custom').
const MANUELS_DATA = {
  'lecture-piano': LECTURE_PIANO,
}

export function genererProgression(
  manuelId: string,
  rentreeDate: string,
  customProgression?: ProgressionSemaine[]
): Omit<Semaine, 'id' | 'class_id'>[] {
  const semaines = customProgression ?? MANUELS_DATA[manuelId as keyof typeof MANUELS_DATA]?.semaines
  if (!semaines) throw new Error(`Manuel inconnu : ${manuelId}`)

  const debut = new Date(rentreeDate)

  return Array.from({ length: 36 }, (_, i) => {
    const semManuel = semaines[i]
    const semEdm = EDM_PROGRESSION_CP[i]
    const dateDebut = addWeeks(debut, i)

    return {
      numero: i + 1,
      date_debut: format(dateDebut, 'yyyy-MM-dd'),
      graphemes: semManuel?.graphemes ?? [],
      edm_theme: semEdm.theme,
      edm_competences: semEdm.competences,
      manuel_pages: semManuel?.pages ?? null,
      mots_exemple: semManuel?.mots_exemple ?? null,
      note: null,
    }
  })
}
