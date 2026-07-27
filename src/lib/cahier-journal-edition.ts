import type { JourJournal, SeanceJournal } from '@/types'

const JOURS = new Set<JourJournal['jour']>([
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
])

const HEURE = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/
const MAX_SEANCES_PAR_JOUR = 40
const MAX_MATIERE = 200
const MAX_DEROULEMENT = 20_000

function minutesDepuisMinuit(heure: string): number {
  const [heures, minutes] = heure.split(':').map(Number)
  return heures * 60 + minutes
}

function validerSeance(value: unknown): SeanceJournal {
  if (!value || typeof value !== 'object') {
    throw new Error('Entrée du cahier journal invalide.')
  }

  const seance = value as Record<string, unknown>
  const matiere = typeof seance.matiere === 'string' ? seance.matiere.trim() : ''
  const heureDebut = typeof seance.heure_debut === 'string' ? seance.heure_debut.trim() : ''
  const heureFin = typeof seance.heure_fin === 'string' ? seance.heure_fin.trim() : ''
  const deroulement = typeof seance.deroulement === 'string' ? seance.deroulement.trim() : ''

  if (!matiere) throw new Error('La matière est obligatoire.')
  if (matiere.length > MAX_MATIERE) throw new Error('Le nom de la matière est trop long.')
  if (!HEURE.test(heureDebut) || !HEURE.test(heureFin)) {
    throw new Error('Les horaires doivent être au format HH:mm.')
  }
  if (minutesDepuisMinuit(heureFin) <= minutesDepuisMinuit(heureDebut)) {
    throw new Error('L’heure de fin doit être après l’heure de début.')
  }
  if (seance.type !== 'cours' && seance.type !== 'routine') {
    throw new Error('Le type de séance est invalide.')
  }
  if (deroulement.length > MAX_DEROULEMENT) {
    throw new Error('Le déroulement est trop long.')
  }

  return {
    matiere,
    heure_debut: heureDebut,
    heure_fin: heureFin,
    type: seance.type,
    deroulement: seance.type === 'routine' ? '' : deroulement,
  }
}

export function validerContenuJournal(value: unknown): JourJournal[] {
  if (!Array.isArray(value) || value.length > JOURS.size) {
    throw new Error('Le cahier journal doit contenir au maximum cinq jours.')
  }

  const joursVus = new Set<JourJournal['jour']>()

  return value.map((entree): JourJournal => {
    if (!entree || typeof entree !== 'object') {
      throw new Error('Jour du cahier journal invalide.')
    }

    const jour = (entree as Record<string, unknown>).jour
    const seances = (entree as Record<string, unknown>).seances
    if (typeof jour !== 'string' || !JOURS.has(jour as JourJournal['jour'])) {
      throw new Error('Jour du cahier journal invalide.')
    }
    if (joursVus.has(jour as JourJournal['jour'])) {
      throw new Error('Un jour ne peut apparaître qu’une fois dans le cahier journal.')
    }
    joursVus.add(jour as JourJournal['jour'])

    if (!Array.isArray(seances) || seances.length > MAX_SEANCES_PAR_JOUR) {
      throw new Error('Le nombre de séances du jour est invalide.')
    }

    return {
      jour: jour as JourJournal['jour'],
      seances: seances.map(validerSeance),
    }
  })
}

function verifierAdresse(
  journal: JourJournal[],
  jourIndex: number,
  seanceIndex: number,
): void {
  if (!Number.isInteger(jourIndex) || !Number.isInteger(seanceIndex)) {
    throw new Error('Entrée du cahier journal introuvable.')
  }
  if (!journal[jourIndex]?.seances[seanceIndex]) {
    throw new Error('Entrée du cahier journal introuvable.')
  }
}

export function modifierSeanceJournal(
  journal: JourJournal[],
  jourIndex: number,
  seanceIndex: number,
  nouvelleSeance: SeanceJournal,
): JourJournal[] {
  verifierAdresse(journal, jourIndex, seanceIndex)
  const seanceValidee = validerSeance(nouvelleSeance)

  return journal.map((jour, indexJour) => (
    indexJour !== jourIndex
      ? jour
      : {
          ...jour,
          seances: jour.seances.map((seance, indexSeance) => (
            indexSeance === seanceIndex ? seanceValidee : seance
          )),
        }
  ))
}

export function supprimerSeanceJournal(
  journal: JourJournal[],
  jourIndex: number,
  seanceIndex: number,
): JourJournal[] {
  verifierAdresse(journal, jourIndex, seanceIndex)

  return journal.map((jour, indexJour) => (
    indexJour !== jourIndex
      ? jour
      : {
          ...jour,
          seances: jour.seances.filter((_, indexSeance) => indexSeance !== seanceIndex),
        }
  ))
}
