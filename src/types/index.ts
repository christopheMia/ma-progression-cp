import type { ProgressionSemaine } from '@/data/manuels'
import type { PeriodeProgrammation } from '@/lib/repartition-periode'

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
  /** Periode scolaire reelle P1-P5. Null pour les anciennes classes non calees. */
  periode_numero?: number | null
}

export type Progression = {
  id: string
  class_id: string
  matiere: string
  numero: number
  items: string[]
  pages: string | null
  mots_exemple: string[] | null
}

export type Methode = {
  id: string
  class_id: string
  matiere: string
  manuel: string | null
  niveau: string | null
  suivi_actif: boolean
}

export type MethodeSourceBase = {
  id: string
  methode_id: string
  nom_source: string
  contenu_structure: {
    semaines: ProgressionSemaine[]
    periodes: PeriodeProgrammation[]
  }
  empreinte_contenu: string
  created_at: string
}

export type MethodeSource = MethodeSourceBase & (
  | {
      type_document: 'manuel'
      periode_numero: null
      niveau_precision: 1
    }
  | {
      type_document: 'programmation'
      periode_numero: null
      niveau_precision: 2
    }
  | {
      type_document: 'periode'
      periode_numero: 1 | 2 | 3 | 4 | 5
      niveau_precision: 3
    }
)

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
  matiere: string
  grapheme: string
  acquis: boolean
}

export type Appreciation = {
  id: string
  semaine_id: string
  eleve_id: string
  matiere: string
  statut: string | null // 'acquis' | 'pas_acquis' | null
  commentaire: string | null
}

export type CreneauHoraire = {
  id: string
  class_id: string
  jour: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi'
  heure_debut: string
  heure_fin: string
  matiere: string
  ordre: number
  couleur: string | null
  type: 'cours' | 'routine'
  methode_id: string | null
  visible_journal: boolean
}

export type SeanceJournal = {
  matiere: string
  heure_debut: string
  heure_fin: string
  type: 'cours' | 'routine'
  deroulement: string
}

export type JourJournal = {
  jour: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi'
  seances: SeanceJournal[]
}

/** Ligne de progression d'une matière pour une semaine (issue de la table progression). */
export type ProgressionMatiere = {
  methode_id: string | null
  matiere: string
  items: string[]
  pages: string | null
  mots_exemple: string[] | null
}
