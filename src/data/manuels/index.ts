import { Manuel } from '@/types'

// Liste des manuels proposés au choix : VIDE volontairement.
// Les progressions « écrites » n'étaient pas fiables → l'enseignant importe la sienne
// via l'IA. (La progression Lecture Piano reste dans le code, utilisée uniquement
// par le mode démonstration — voir src/lib/progression.ts.)
export const MANUELS: Manuel[] = []

export type ProgressionSemaine = {
  numero: number
  graphemes: string[]
  pages: string
  mots_exemple: string[]
}

export type ProgressionManuel = {
  id: string
  semaines: ProgressionSemaine[]
}
