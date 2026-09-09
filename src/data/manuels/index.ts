import { Manuel, SeanceProgression } from '@/types'

// Liste des manuels proposés au choix : VIDE volontairement.
// Les progressions « écrites » n'étaient pas fiables → l'enseignant importe la sienne
// via l'IA. (La progression Lecture Piano reste dans le code, utilisée uniquement
// par le mode démonstration — voir src/lib/progression.ts.)
export const MANUELS: Manuel[] = []

export type ProgressionSemaine = {
  numero: number
  items: string[]
  pages: string
  mots_exemple: string[]
  /**
   * La grille jours x puces du document, quand elle a pu être lue. Optionnel
   * parce que les progressions écrites en dur et les fixtures de test n'en
   * portent pas ; `normalizeProgression`, elle, en rend toujours une (au pire
   * un tableau vide), pour qu'un lecteur n'ait jamais à distinguer « absent »
   * de « vide ».
   */
  seances?: SeanceProgression[]
}

export type ProgressionManuel = {
  id: string
  semaines: ProgressionSemaine[]
}
