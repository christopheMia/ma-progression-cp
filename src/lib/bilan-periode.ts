/**
 * Du suivi d'une période au bilan proposé, compétence par compétence.
 *
 * C'est le pont entre ce que l'enseignante coche chaque semaine (des notions
 * de sa méthode) et ce que le livret officiel demande (des compétences du
 * programme). Le chemin est : notion suivie -> rattachement -> compétence.
 *
 * Rien n'est décidé en cachette : chaque ligne rend le nombre d'observations,
 * la dernière semaine observée et les notions qui l'ont nourrie, pour que
 * l'enseignante voie d'où sort le niveau proposé et le corrige si besoin.
 *
 * Fonction pure, sans React ni Supabase.
 */

import { NIVEAUX, type Niveau } from '@/lib/niveaux'

export type CompetenceBilan = {
  id: string
  matiere: string
  domaine: string
  libelle: string
}

export type Rattachement = {
  matiere: string
  semaine: number
  notion: string
  competenceId: string
}

export type ObservationPeriode = {
  semaine: number
  matiere: string
  notion: string
  niveau: Niveau
}

export type EntreeBilan = {
  /** Les numéros de semaine de la période. */
  semaines: number[]
  competences: CompetenceBilan[]
  rattachements: Rattachement[]
  observations: ObservationPeriode[]
}

export type ElementBilan = {
  competenceId: string
  matiere: string
  domaine: string
  libelle: string
  /** Le niveau proposé, ou null si rien n'a été observé. */
  niveau: Niveau | null
  observations: number
  derniereSemaine: number | null
  /** Les notions de la méthode qui ont nourri cette ligne. */
  notions: string[]
}

const cle = (matiere: string, semaine: number, notion: string) =>
  `${matiere}|${semaine}|${notion}`

/** Rang dans l'échelle : sert à retenir la plus avancée de deux observations. */
const rang = (niveau: Niveau) => NIVEAUX.indexOf(niveau)

export function construireBilanPeriode(entree: EntreeBilan): ElementBilan[] {
  const { semaines, competences, rattachements, observations } = entree
  const dansLaPeriode = new Set(semaines)

  const rattachementsPeriode = rattachements.filter(r => dansLaPeriode.has(r.semaine))
  if (rattachementsPeriode.length === 0) return []

  // Notion suivie -> compétence.
  const competenceDeLaNotion = new Map<string, string>()
  for (const r of rattachementsPeriode) {
    competenceDeLaNotion.set(cle(r.matiere, r.semaine, r.notion), r.competenceId)
  }

  // Les notions travaillées, par compétence, sans doublon et dans l'ordre.
  const notionsParCompetence = new Map<string, string[]>()
  for (const r of rattachementsPeriode) {
    const liste = notionsParCompetence.get(r.competenceId) ?? []
    if (!liste.includes(r.notion)) liste.push(r.notion)
    notionsParCompetence.set(r.competenceId, liste)
  }

  type Cumul = { niveau: Niveau | null; observations: number; derniereSemaine: number | null }
  const cumuls = new Map<string, Cumul>()

  for (const observation of observations) {
    if (!dansLaPeriode.has(observation.semaine)) continue
    const competenceId = competenceDeLaNotion.get(
      cle(observation.matiere, observation.semaine, observation.notion),
    )
    if (!competenceId) continue

    const cumul = cumuls.get(competenceId) ?? { niveau: null, observations: 0, derniereSemaine: null }
    cumul.observations++

    // Ce que l'enfant sait EN FIN de période est ce qui compte : la semaine la
    // plus récente l'emporte. À semaine égale, la plus avancée l'emporte, car
    // une réussite prouve une capacité qu'un échec ailleurs n'efface pas.
    const plusRecente = cumul.derniereSemaine === null || observation.semaine > cumul.derniereSemaine
    const memeSemainePlusHaute = observation.semaine === cumul.derniereSemaine
      && cumul.niveau !== null
      && rang(observation.niveau) > rang(cumul.niveau)

    if (plusRecente || memeSemainePlusHaute) {
      cumul.niveau = observation.niveau
      cumul.derniereSemaine = observation.semaine
    }
    cumuls.set(competenceId, cumul)
  }

  const travaillees = new Set(rattachementsPeriode.map(r => r.competenceId))

  // L'ordre du livret : matière, puis domaine. On suit l'ordre du référentiel
  // reçu plutôt que l'alphabet, qui n'a pas de sens pédagogique.
  return competences
    .filter(competence => travaillees.has(competence.id))
    .map(competence => {
      const cumul = cumuls.get(competence.id)
      return {
        competenceId: competence.id,
        matiere: competence.matiere,
        domaine: competence.domaine,
        libelle: competence.libelle,
        niveau: cumul?.niveau ?? null,
        observations: cumul?.observations ?? 0,
        derniereSemaine: cumul?.derniereSemaine ?? null,
        notions: notionsParCompetence.get(competence.id) ?? [],
      }
    })
}
