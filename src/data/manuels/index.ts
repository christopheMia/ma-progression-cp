import { Manuel } from '@/types'

export const MANUELS: Manuel[] = [
  { id: 'lecture-piano', nom: 'Lecture Piano', editeur: 'Retz (2025)' },
  { id: 'au-cp-avec-meli', nom: 'Au CP avec Méli', editeur: 'Lelivrescolaire' },
]

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
