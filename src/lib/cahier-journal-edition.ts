import type { JourJournal, SeanceJournal, SeancePlacer } from '@/types'

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
export const MAX_DEROULEMENT = 20_000
// Large : toutes les séances « semaine » d'une progression atterrissent le jour 1.
const MAX_A_PLACER_PAR_JOUR = 200

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

/**
 * Garde la liste « à placer » d'un jour. Une entrée mal formée (pas un objet,
 * libellé absent ou vide) est écartée en silence : rien n'est inventé. Les
 * limites, elles, refusent avec un message clair comme `validerSeance`, car
 * tronquer ou jeter un vrai texte ferait perdre ce que l'enseignante a écrit.
 */
function validerAPlacer(brut: unknown): SeancePlacer[] {
  if (!Array.isArray(brut)) return []
  if (brut.length > MAX_A_PLACER_PAR_JOUR) {
    throw new Error('Le nombre de séances à placer du jour est trop élevé.')
  }

  return brut.flatMap((element): SeancePlacer[] => {
    if (!element || typeof element !== 'object') return []
    const champs = element as Record<string, unknown>
    const libelle = typeof champs.libelle === 'string' ? champs.libelle.trim() : ''
    if (!libelle) return []
    if (libelle.length > MAX_DEROULEMENT) {
      throw new Error('Le libellé d’une séance à placer est trop long.')
    }
    const origine = typeof champs.origine === 'string' ? champs.origine.trim() : ''
    if (origine.length > MAX_MATIERE) {
      throw new Error('L’origine d’une séance à placer est trop longue.')
    }
    return [{ libelle, origine: origine || null }]
  })
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

    const champsJour = entree as Record<string, unknown>
    const jour = champsJour.jour
    const seances = champsJour.seances
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

    const aPlacer = validerAPlacer(champsJour.aPlacer)

    return {
      jour: jour as JourJournal['jour'],
      seances: seances.map(validerSeance),
      ...(aPlacer.length ? { aPlacer } : {}),
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
