import { seancesDepuisItems } from '@/lib/progression-seances'

/**
 * Mise en forme du « Contenu de la semaine » (fiche de semaine).
 *
 * Retour de Christophe, 17/10/2026 : toutes les séances d'une matière étaient
 * collées dans une seule phrase, entre guillemets et reliées par « et »,
 * « ça fait brouillon et pas lisible ». On range donc chaque puce sur sa
 * ligne, groupée par jour quand le document donne les jours, avec son domaine
 * à part pour l'afficher en étiquette.
 *
 * La lecture passe par `seancesDepuisItems`, la même que le cahier journal :
 * même préfixe de jour, mêmes abréviations (LC, PDE, décision de Cécile du
 * 09/09). Aucun texte de l'enseignante n'est perdu : ce qui suit le domaine
 * reste entier, deux-points compris.
 */

export type EntreeContenu = {
  /** Domaine en étiquette (« LC », « Poésie »), "" quand le texte n'en porte pas. */
  domaine: string
  texte: string
}

export type GroupeContenu = {
  /** Rang du jour d'école, `null` pour ce qui n'est rattaché à aucun jour. */
  jour: number | null
  entrees: EntreeContenu[]
}

function separerDomaine(libelle: string, domaine: string): EntreeContenu {
  if (!domaine) return { domaine: '', texte: libelle }
  const coupe = libelle.indexOf(':')
  const reste = coupe >= 0 ? libelle.slice(coupe + 1).trim() : ''
  // « LC : » sans rien derrière : on garde le domaine comme texte plutôt
  // qu'une étiquette seule devant une ligne vide.
  if (!reste) return { domaine: '', texte: libelle }
  return { domaine, texte: reste }
}

/**
 * Groupes dans l'ordre des jours (1, 2, 3...), puis un dernier groupe sans
 * jour. Quand aucune puce n'a de jour, un seul groupe `jour: null` : la
 * matière s'affiche en simple liste.
 */
export function contenuSemaine(items: unknown[] | null | undefined): GroupeContenu[] {
  const parJour = new Map<number | null, EntreeContenu[]>()
  for (const seance of seancesDepuisItems(items)) {
    const entree = separerDomaine(seance.libelle, seance.domaine)
    const liste = parJour.get(seance.jour) ?? []
    liste.push(entree)
    parJour.set(seance.jour, liste)
  }
  const jours = [...parJour.keys()]
    .filter((j): j is number => j !== null)
    .sort((a, b) => a - b)
  const groupes: GroupeContenu[] = jours.map(jour => ({ jour, entrees: parJour.get(jour)! }))
  const sansJour = parJour.get(null)
  if (sansJour) groupes.push({ jour: null, entrees: sansJour })
  return groupes
}
