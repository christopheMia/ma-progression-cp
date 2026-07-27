/**
 * Vue d'ensemble de la classe : une ligne par élève, une case par notion.
 *
 * Demande de Christophe du 27/07/2026. L'écran de suivi est organisé par
 * notion, donc pour savoir où en est la classe il faut parcourir les 23 élèves
 * de chaque notion, et pour savoir où en est UN élève il faut parcourir toutes
 * les notions. Cette fonction produit le tableau qui répond aux deux questions
 * d'un coup d'oeil.
 *
 * Fonction pure, sans React ni Supabase : elle reçoit de quoi lire les valeurs
 * et rend le tableau. Elle se teste donc sans monter le composant.
 */

export type StatutCase = 'vide' | 'aucun' | 'partiel' | 'complet'

export type NotionSuivie = { matiere: string; notion: string }

export type CritereSuivi = {
  id: string
  matiere: string
  notion: string
  libelle: string
  ordre: number
}

export type EntreeSuivi = {
  eleves: { id: string; prenom: string }[]
  notions: NotionSuivie[]
  criteres: CritereSuivi[]
  /** Rend true, false, ou null si l'enseignant n'a pas encore tranché. */
  valeurCritere: (eleveId: string, critereId: string) => boolean | null
  /** Suivi global de la notion, utilisé quand elle n'a aucun critère. */
  valeurNotion: (eleveId: string, matiere: string, notion: string) => boolean | null
}

export type CaseSuivi = {
  matiere: string
  notion: string
  acquis: number
  total: number
  statut: StatutCase
}

export type LigneSuivi = {
  eleveId: string
  prenom: string
  cases: CaseSuivi[]
}

function statutPour(acquis: number, total: number, renseignes: number): StatutCase {
  if (renseignes === 0) return 'vide'
  if (acquis === 0) return 'aucun'
  if (acquis >= total) return 'complet'
  return 'partiel'
}

export function agregerClasse(entree: EntreeSuivi): LigneSuivi[] {
  const { eleves, notions, criteres, valeurCritere, valeurNotion } = entree

  return eleves.map(eleve => ({
    eleveId: eleve.id,
    prenom: eleve.prenom,
    cases: notions.map(({ matiere, notion }) => {
      const criteresNotion = criteres.filter(c => c.matiere === matiere && c.notion === notion)

      // Sans critère personnalisé, la notion compte pour elle-même.
      if (criteresNotion.length === 0) {
        const globale = valeurNotion(eleve.id, matiere, notion)
        const acquis = globale === true ? 1 : 0
        return {
          matiere,
          notion,
          acquis,
          total: 1,
          statut: statutPour(acquis, 1, globale === null ? 0 : 1),
        }
      }

      let acquis = 0
      let renseignes = 0
      for (const critere of criteresNotion) {
        const valeur = valeurCritere(eleve.id, critere.id)
        if (valeur === null) continue
        renseignes++
        if (valeur) acquis++
      }

      return {
        matiere,
        notion,
        acquis,
        total: criteresNotion.length,
        statut: statutPour(acquis, criteresNotion.length, renseignes),
      }
    }),
  }))
}
