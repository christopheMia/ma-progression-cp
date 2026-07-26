import { familleMatiere } from '@/data/trame-edt'

export type MatiereImposeeMatin =
  | 'mathematiques'
  | 'code'
  | 'etude-langue'

export type CreneauPrioriteMatin = {
  jour: string
  heure_debut: string
  heure_fin: string
  matiere: string
  type?: 'cours' | 'routine'
  ordre?: number
}

export type DeplacementMatin = {
  matiere: string
  depuis: string
  vers: string
}

export type ResultatPrioriteMatin<T extends CreneauPrioriteMatin> =
  | {
      ok: true
      creneaux: T[]
      modifie: boolean
      deplacements: DeplacementMatin[]
    }
  | {
      ok: false
      creneaux: T[]
      message: string
    }

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const
const LIMITE_MATIN_PAR_DEFAUT = '12:00'

function normaliserLibelle(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Identifie uniquement les trois matières désignées par Christophe.
 * Le français général, la lecture compréhension, l'écriture et la production
 * d'écrits ne sont pas assimilés à l'étude du code ou de la langue.
 */
export function matiereImposeeLeMatin(
  matiere: string,
): MatiereImposeeMatin | null {
  if (familleMatiere(matiere) === 'maths') return 'mathematiques'

  const libelle = normaliserLibelle(matiere)
  if (
    /\bcode\b|\bphonologie\b|\bphoneme|\bgrapheme|\bencodage\b|\bdecodage\b|appropriation des graphemes|lecture ecriture/.test(
      libelle,
    )
  ) {
    return 'code'
  }
  if (
    /etude de la langue|\bgrammaire\b|\borthographe\b|\bconjugaison\b|\bvocabulaire\b|\blexique\b|\bdictee\b/.test(
      libelle,
    )
  ) {
    return 'etude-langue'
  }
  return null
}

function estTempsFixe(creneau: CreneauPrioriteMatin): boolean {
  if (creneau.type === 'routine') return true
  return /rituel|accueil|recre|dejeuner|cantine|repas|pause meridienne|rangement|cartable|bilan de la journee|\bapc\b/.test(
    normaliserLibelle(creneau.matiere),
  )
}

function minutes(heure: string): number {
  const [h, m] = heure.split(':').map(Number)
  return h * 60 + m
}

function duree(creneau: CreneauPrioriteMatin): number {
  return minutes(creneau.heure_fin) - minutes(creneau.heure_debut)
}

function limitesMatin(
  creneaux: CreneauPrioriteMatin[],
): Map<string, string> {
  const limites = new Map<string, string>()
  for (const jour of JOURS) limites.set(jour, LIMITE_MATIN_PAR_DEFAUT)

  for (const creneau of creneaux) {
    if (
      creneau.type === 'routine'
      && /dejeuner|cantine|repas|pause meridienne/.test(
        normaliserLibelle(creneau.matiere),
      )
    ) {
      const actuelle = limites.get(creneau.jour) ?? LIMITE_MATIN_PAR_DEFAUT
      if (
        actuelle === LIMITE_MATIN_PAR_DEFAUT
        || creneau.heure_debut < actuelle
      ) {
        limites.set(creneau.jour, creneau.heure_debut)
      }
    }
  }
  return limites
}

function estLeMatin(
  creneau: CreneauPrioriteMatin,
  limites: Map<string, string>,
): boolean {
  const limite = limites.get(creneau.jour) ?? LIMITE_MATIN_PAR_DEFAUT
  return creneau.heure_fin <= limite
}

function rangCreneau(
  a: CreneauPrioriteMatin,
  b: CreneauPrioriteMatin,
): number {
  const rangJour = (jour: string) => {
    const index = JOURS.indexOf(jour as typeof JOURS[number])
    return index === -1 ? JOURS.length : index
  }
  return rangJour(a.jour) - rangJour(b.jour)
    || a.heure_debut.localeCompare(b.heure_debut)
    || a.heure_fin.localeCompare(b.heure_fin)
    || (a.ordre ?? 0) - (b.ordre ?? 0)
}

function echangerPlacements<T extends CreneauPrioriteMatin>(
  creneaux: T[],
  indexMatin: number,
  indexApresMidi: number,
): T[] {
  const matin = creneaux[indexMatin]
  const apresMidi = creneaux[indexApresMidi]
  const suivant = [...creneaux]

  suivant[indexMatin] = {
    ...apresMidi,
    jour: matin.jour,
    heure_debut: matin.heure_debut,
    heure_fin: matin.heure_fin,
    ordre: matin.ordre,
  }
  suivant[indexApresMidi] = {
    ...matin,
    jour: apresMidi.jour,
    heure_debut: apresMidi.heure_debut,
    heure_fin: apresMidi.heure_fin,
    ordre: apresMidi.ordre,
  }
  return suivant
}

/**
 * Donne la priorité aux mathématiques, au code et à l'étude de la langue dans
 * l'ensemble des créneaux du matin.
 *
 * La correction échange uniquement deux séances complètes de même durée. Les
 * contenus, styles, jours et horaires disponibles sont ainsi préservés. Si une
 * séance devrait être découpée ou voir sa durée modifiée, l'enregistrement est
 * refusé avec une explication au lieu d'altérer silencieusement l'EDT.
 */
export function corrigerPrioriteMatin<T extends CreneauPrioriteMatin>(
  entree: T[],
): ResultatPrioriteMatin<T> {
  if (!entree.length) {
    return { ok: true, creneaux: entree, modifie: false, deplacements: [] }
  }

  const limites = limitesMatin(entree)
  let creneaux = entree
  const deplacements: DeplacementMatin[] = []

  const indicesImposesApresMidi = () => creneaux
    .map((creneau, index) => ({ creneau, index }))
    .filter(({ creneau }) =>
      creneau.type !== 'routine'
      && matiereImposeeLeMatin(creneau.matiere) !== null
      && !estLeMatin(creneau, limites))
    .sort((a, b) => rangCreneau(a.creneau, b.creneau))

  const indicesAutresMatin = () => creneaux
    .map((creneau, index) => ({ creneau, index }))
    .filter(({ creneau }) =>
      !estTempsFixe(creneau)
      && matiereImposeeLeMatin(creneau.matiere) === null
      && estLeMatin(creneau, limites))
    .sort((a, b) => rangCreneau(a.creneau, b.creneau))

  for (const imposee of indicesImposesApresMidi()) {
    const candidates = indicesAutresMatin()
      .filter(({ creneau }) => duree(creneau) === duree(imposee.creneau))
      .sort((a, b) => {
        const memeJourA = a.creneau.jour === imposee.creneau.jour ? 0 : 1
        const memeJourB = b.creneau.jour === imposee.creneau.jour ? 0 : 1
        return memeJourA - memeJourB || rangCreneau(a.creneau, b.creneau)
      })
    const candidate = candidates[0]
    if (!candidate) continue

    deplacements.push({
      matiere: imposee.creneau.matiere,
      depuis: `${imposee.creneau.jour} ${imposee.creneau.heure_debut}-${imposee.creneau.heure_fin}`,
      vers: `${candidate.creneau.jour} ${candidate.creneau.heure_debut}-${candidate.creneau.heure_fin}`,
    })
    creneaux = echangerPlacements(creneaux, candidate.index, imposee.index)
  }

  const imposeesRestantes = indicesImposesApresMidi()
  const autresRestantes = indicesAutresMatin()
  if (imposeesRestantes.length && autresRestantes.length) {
    const imposee = imposeesRestantes[0].creneau
    return {
      ok: false,
      creneaux: entree,
      message:
        `${imposee.matiere} est placée l'après-midi alors qu'une autre matière occupe encore le matin. `
        + `Sa séance dure ${duree(imposee)} min et aucun créneau du matin de même durée ne permet de la déplacer sans découper ou modifier un cours. `
        + `Ajoute ou libère un créneau du matin de ${duree(imposee)} min, puis réessaie.`,
    }
  }

  return {
    ok: true,
    creneaux,
    modifie: deplacements.length > 0,
    deplacements,
  }
}
