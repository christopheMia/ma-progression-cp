// src/lib/eleves-mise-a-jour.ts
//
// Décide ce qu'il faut écrire dans la base quand la maîtresse enregistre sa
// liste d'élèves. Fonction pure, testée à part, parce que c'est ici que se joue
// la seule opération vraiment destructrice de l'écran des paramètres.
//
// LE DÉFAUT QUE CE MODULE FERME, trouvé le 9 septembre 2026. L'identité d'un
// élève se faisait par son PRÉNOM : corriger une faute de frappe supprimait
// l'enfant et en créait un autre, donc effaçait tout son suivi, en silence,
// alors que la maîtresse croyait corriger une lettre. Deux enfants du même
// prénom étaient par ailleurs impossibles à distinguer.
//
// L'identité se fait désormais par l'identifiant, et le prénom redevient ce
// qu'il aurait toujours dû être : une étiquette qu'on peut corriger.

export type EleveExistant = { id: string; prenom: string }

/** Une ligne telle que l'écran la renvoie. Sans `id`, c'est un nouvel élève. */
export type EleveSaisi = { id?: string; prenom: string }

export type PlanEleves = {
  aRenommer: { id: string; prenom: string }[]
  aInserer: { prenom: string; ordre: number }[]
  /** Identifiants à supprimer, avec tout le suivi qui leur est rattaché. */
  aSupprimer: string[]
  aReordonner: { id: string; ordre: number }[]
  /** La classe avait des élèves et n'en a plus aucun. À confirmer avant d'agir. */
  videTout: boolean
}

export function planifierMiseAJourEleves(
  existants: EleveExistant[],
  saisis: EleveSaisi[],
): PlanEleves {
  const connus = new Map(existants.map(e => [e.id, e]))
  const plan: PlanEleves = {
    aRenommer: [],
    aInserer: [],
    aSupprimer: [],
    aReordonner: [],
    videTout: false,
  }

  const gardes = new Set<string>()
  let ordre = 0

  for (const ligne of saisis) {
    const prenom = ligne.prenom.trim()
    if (!prenom) continue

    const existant = ligne.id ? connus.get(ligne.id) : undefined

    // Un identifiant inconnu, ou déjà traité plus haut dans la liste, ne doit
    // jamais servir à écrire : dans le doute on crée, on n'écrase pas.
    if (!existant || gardes.has(existant.id)) {
      if (!existant) plan.aInserer.push({ prenom, ordre })
      ordre += 1
      continue
    }

    gardes.add(existant.id)
    if (existant.prenom !== prenom) plan.aRenommer.push({ id: existant.id, prenom })
    plan.aReordonner.push({ id: existant.id, ordre })
    ordre += 1
  }

  plan.aSupprimer = existants.filter(e => !gardes.has(e.id)).map(e => e.id)
  plan.videTout = existants.length > 0 && gardes.size === 0

  return plan
}
