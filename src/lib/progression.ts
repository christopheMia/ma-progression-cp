import { addWeeks, format } from 'date-fns'
import { LECTURE_PIANO } from '@/data/manuels/lecture-piano'
import { AU_CP_AVEC_MELI } from '@/data/manuels/au-cp-avec-meli'
import { RIBAMBELLE } from '@/data/manuels/ribambelle'
import { CALIMOTS } from '@/data/manuels/calimots'
import { TAOKI } from '@/data/manuels/taoki'
import { TIMINI } from '@/data/manuels/timini'
import { LUNE } from '@/data/manuels/lune'
import { A_MOI_DE_LIRE } from '@/data/manuels/a-moi-de-lire'
import { EDM_PROGRESSION_CP } from '@/data/edm/progression-cp'
import { Semaine } from '@/types'

const MANUELS_DATA = {
  'lecture-piano': LECTURE_PIANO,
  'au-cp-avec-meli': AU_CP_AVEC_MELI,
  'ribambelle': RIBAMBELLE,
  'calimots': CALIMOTS,
  'taoki': TAOKI,
  'timini': TIMINI,
  'lune': LUNE,
  'a-moi-de-lire': A_MOI_DE_LIRE,
}

export function genererProgression(
  manuelId: string,
  rentreeDate: string
): Omit<Semaine, 'id' | 'class_id'>[] {
  const manuel = MANUELS_DATA[manuelId as keyof typeof MANUELS_DATA]
  if (!manuel) throw new Error(`Manuel inconnu : ${manuelId}`)

  const debut = new Date(rentreeDate)

  return Array.from({ length: 36 }, (_, i) => {
    const semManuel = manuel.semaines[i]
    const semEdm = EDM_PROGRESSION_CP[i]
    const dateDebut = addWeeks(debut, i)

    return {
      numero: i + 1,
      date_debut: format(dateDebut, 'yyyy-MM-dd'),
      graphemes: semManuel.graphemes,
      edm_theme: semEdm.theme,
      edm_competences: semEdm.competences,
      manuel_pages: semManuel.pages,
      mots_exemple: semManuel.mots_exemple,
      note: null,
    }
  })
}
