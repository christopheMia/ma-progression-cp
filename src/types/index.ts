export type Manuel = { id: string; nom: string; editeur: string }

export type Semaine = {
  id: string
  class_id: string
  numero: number
  date_debut: string
  graphemes: string[]
  edm_theme: string
  edm_competences: string
  manuel_pages: string | null
  mots_exemple: string[] | null
  note: string | null
}

export type Eleve = {
  id: string
  class_id: string
  prenom: string
  ordre: number
}

export type Acquisition = {
  id: string
  semaine_id: string
  eleve_id: string
  grapheme: string
  acquis: boolean
}

export type CreneauHoraire = {
  id: string
  class_id: string
  jour: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi'
  heure_debut: string
  heure_fin: string
  matiere: string
  ordre: number
}

export type SeanceJournal = {
  matiere: string
  heure_debut: string
  heure_fin: string
  objectif: string
  activite: string
  materiel: string
  note: string
}

export type JourJournal = {
  jour: string
  seances: SeanceJournal[]
}
