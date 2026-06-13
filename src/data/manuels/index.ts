import { Manuel } from '@/types'

export const MANUELS: Manuel[] = [
  { id: 'lecture-piano', nom: 'Lecture Piano', editeur: 'Retz' },
  { id: 'au-cp-avec-meli', nom: 'Au CP avec Méli', editeur: 'Lelivrescolaire' },
  { id: 'ribambelle', nom: 'Ribambelle', editeur: 'Hatier' },
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
