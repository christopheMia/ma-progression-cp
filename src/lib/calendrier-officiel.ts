export type ZoneScolaire = 'A' | 'B' | 'C'

export type PeriodeOfficielle = {
  numero: number
  nom: string
  date_debut: string
  date_fin: string
  ordre: number
}

type BornesAnnuelles = {
  rentree: string
  fins: [string, string, string, string, string]
  reprises: [string, string, string, string]
}

/**
 * Calendriers metropolitains publies par le ministere de l'Education nationale.
 * Source : https://www.education.gouv.fr/calendrier-scolaire-toutes-les-dates-des-cours-et-des-vacances-100148
 */
const CALENDRIERS: Record<string, Record<ZoneScolaire, BornesAnnuelles>> = {
  '2025': {
    A: {
      rentree: '2025-09-01',
      fins: ['2025-10-18', '2025-12-20', '2026-02-07', '2026-04-04', '2026-07-04'],
      reprises: ['2025-11-03', '2026-01-05', '2026-02-23', '2026-04-20'],
    },
    B: {
      rentree: '2025-09-01',
      fins: ['2025-10-18', '2025-12-20', '2026-02-14', '2026-04-11', '2026-07-04'],
      reprises: ['2025-11-03', '2026-01-05', '2026-03-02', '2026-04-27'],
    },
    C: {
      rentree: '2025-09-01',
      fins: ['2025-10-18', '2025-12-20', '2026-02-21', '2026-04-18', '2026-07-04'],
      reprises: ['2025-11-03', '2026-01-05', '2026-03-09', '2026-05-04'],
    },
  },
  '2026': {
    A: {
      rentree: '2026-09-01',
      fins: ['2026-10-17', '2026-12-19', '2027-02-13', '2027-04-10', '2027-07-03'],
      reprises: ['2026-11-02', '2027-01-04', '2027-03-01', '2027-04-26'],
    },
    B: {
      rentree: '2026-09-01',
      fins: ['2026-10-17', '2026-12-19', '2027-02-20', '2027-04-17', '2027-07-03'],
      reprises: ['2026-11-02', '2027-01-04', '2027-03-08', '2027-05-03'],
    },
    C: {
      rentree: '2026-09-01',
      fins: ['2026-10-17', '2026-12-19', '2027-02-06', '2027-04-03', '2027-07-03'],
      reprises: ['2026-11-02', '2027-01-04', '2027-02-22', '2027-04-19'],
    },
  },
}

export function estZoneScolaire(value: unknown): value is ZoneScolaire {
  return value === 'A' || value === 'B' || value === 'C'
}

/** Renvoie les cinq periodes de l'annee de la date de rentree. */
export function periodesOfficielles(
  rentreeDate: string,
  zone: ZoneScolaire,
): PeriodeOfficielle[] {
  const calendrier = CALENDRIERS[rentreeDate.slice(0, 4)]?.[zone]
  if (!calendrier) return []

  // Le jour choisi par l'enseignante peut differer legerement de la rentree
  // nationale. Il devient le debut reel de P1, sans autoriser une date anterieure.
  const debutP1 = rentreeDate > calendrier.rentree ? rentreeDate : calendrier.rentree
  const debuts = [debutP1, ...calendrier.reprises]

  return debuts.map((date_debut, index) => ({
    numero: index + 1,
    nom: `Période ${index + 1}`,
    date_debut,
    date_fin: calendrier.fins[index],
    ordre: index + 1,
  }))
}

/** Rentree proposee par defaut pour la prochaine annee disponible. */
export function rentreeOfficielleParDefaut(zone: ZoneScolaire = 'A'): string {
  return CALENDRIERS['2026'][zone].rentree
}
