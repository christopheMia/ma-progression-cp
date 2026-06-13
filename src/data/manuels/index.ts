import { Manuel } from '@/types'

export const MANUELS: Manuel[] = [
  { id: 'lecture-piano', nom: 'Lecture Piano', editeur: 'Retz (2025)' },
  { id: 'calimots', nom: 'Calimots', editeur: 'Retz (2025)' },
  { id: 'taoki', nom: 'Taoki et compagnie', editeur: 'Hachette Éducation (2025)' },
  { id: 'timini', nom: 'Timini', editeur: 'Nathan (2025)' },
  { id: 'lune', nom: '1.2.3 Lune !', editeur: 'Bordas (2024)' },
  { id: 'a-moi-de-lire', nom: 'À moi de lire !', editeur: 'Magnard (2024)' },
  { id: 'ribambelle', nom: 'Ribambelle', editeur: 'Hatier' },
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
