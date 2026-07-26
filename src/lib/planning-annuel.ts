import { codeMatiereCanonique, libelleMatiereCanonique } from '@/lib/matieres'
import type { Semaine } from '@/types'

export type ProgressionPlanning = {
  numero: number
  matiere: string
  methode_id: string | null
  items: string[]
  pages?: string | null
  mots_exemple?: string[] | null
}

export type MethodePlanning = {
  id: string
  matiere: string
  manuel: string | null
  suivi_actif: boolean
}

export type AcquisitionPlanning = {
  semaine_id: string
  eleve_id: string
  matiere: string
  grapheme: string
}

export type ContenuPlanning = {
  codeMatiere: string
  libelleMatiere: string
  nomMethode: string
  suiviActif: boolean
  items: string[]
}

export type SemainePlanning = Semaine & {
  contenus: ContenuPlanning[]
  avancement: {
    acquis: number
    total: number
  }
}

export function construirePlanningAnnuel(
  semaines: Semaine[],
  progression: ProgressionPlanning[],
  methodes: MethodePlanning[],
  acquisitions: AcquisitionPlanning[] = [],
  elevesCount = 0,
): SemainePlanning[] {
  const methodeParId = new Map(methodes.map(methode => [methode.id, methode]))
  const methodeParMatiere = new Map(
    methodes.map(methode => [codeMatiereCanonique(methode.matiere), methode]),
  )
  const ordreMatieres = new Map(
    methodes.map((methode, index) => [codeMatiereCanonique(methode.matiere), index]),
  )
  const lignesParSemaine = new Map<number, ProgressionPlanning[]>()
  const acquisitionsParSemaine = new Map<string, AcquisitionPlanning[]>()

  for (const ligne of progression) {
    const lignes = lignesParSemaine.get(ligne.numero) ?? []
    lignes.push(ligne)
    lignesParSemaine.set(ligne.numero, lignes)
  }

  for (const acquisition of acquisitions) {
    const lignes = acquisitionsParSemaine.get(acquisition.semaine_id) ?? []
    lignes.push(acquisition)
    acquisitionsParSemaine.set(acquisition.semaine_id, lignes)
  }

  return semaines.map(semaine => {
    const contenusParMatiere = new Map<string, ContenuPlanning>()

    for (const ligne of lignesParSemaine.get(semaine.numero) ?? []) {
      const codeMatiere = codeMatiereCanonique(ligne.matiere)
      const methode = (ligne.methode_id ? methodeParId.get(ligne.methode_id) : null)
        ?? methodeParMatiere.get(codeMatiere)
      const existant = contenusParMatiere.get(codeMatiere)

      if (existant) {
        ajouterItemsUniques(existant.items, ligne.items)
        continue
      }

      contenusParMatiere.set(codeMatiere, {
        codeMatiere,
        libelleMatiere: libelleMatiereCanonique(codeMatiere),
        nomMethode: methode?.manuel?.trim() || 'Méthode sans nom',
        suiviActif: methode?.suivi_actif === true,
        items: [...new Set(ligne.items)],
      })
    }

    const contenus = [...contenusParMatiere.values()].sort((a, b) => {
      const ordreA = ordreMatieres.get(a.codeMatiere) ?? Number.MAX_SAFE_INTEGER
      const ordreB = ordreMatieres.get(b.codeMatiere) ?? Number.MAX_SAFE_INTEGER
      return ordreA - ordreB || a.codeMatiere.localeCompare(b.codeMatiere, 'fr')
    })

    const itemsActifsParMatiere = new Map<string, Set<string>>(
      contenus
        .filter(contenu => contenu.suiviActif)
        .map(contenu => [contenu.codeMatiere, new Set(contenu.items)]),
    )
    const totalItemsActifs = [...itemsActifsParMatiere.values()]
      .reduce((total, items) => total + items.size, 0)
    const acquisitionsUniques = new Set<string>()
    for (const acquisition of acquisitionsParSemaine.get(semaine.id) ?? []) {
      const codeMatiere = codeMatiereCanonique(acquisition.matiere)
      if (!itemsActifsParMatiere.get(codeMatiere)?.has(acquisition.grapheme)) continue

      acquisitionsUniques.add(JSON.stringify([
        acquisition.eleve_id,
        codeMatiere,
        acquisition.grapheme,
      ]))
    }

    return {
      ...semaine,
      contenus,
      avancement: {
        acquis: acquisitionsUniques.size,
        total: totalItemsActifs * elevesCount,
      },
    }
  })
}

function ajouterItemsUniques(destination: string[], nouveaux: string[]) {
  const connus = new Set(destination)
  for (const item of nouveaux) {
    if (connus.has(item)) continue
    destination.push(item)
    connus.add(item)
  }
}
