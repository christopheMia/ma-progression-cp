/**
 * Rassembler les notions de la progression pour l'écran « Programme couvert ».
 *
 * Pourquoi : l'écran affichait une ligne par notion ET par semaine. Mesuré le
 * 28/07/2026 sur la vraie classe : 5 340 lignes de français pour 314 notions
 * réellement différentes, soit 94 % de répétitions. « Lire a » revenait
 * dix-sept fois, sans rien qui les distingue. Christophe : « il faut défiler
 * pendant une heure pour accéder à chaque matière, c'est horrible. »
 *
 * Une notion apparaît donc UNE fois, avec les semaines où elle revient. La
 * rattacher vaut pour toutes ses semaines : la même notion enseignée deux fois
 * est la même compétence.
 *
 * Fonction pure, sans React ni Supabase.
 */

export type LigneProgression = {
  matiere: string
  numero: number
  items: string[] | null
}

export type LienNotion = {
  matiere: string
  semaine_numero: number
  notion: string
  competence_id: string
}

export type EntreeGroupement = {
  progression: LigneProgression[]
  /** Numéro de semaine vers numéro de période. */
  periodeParSemaine: Record<number, number | null>
  liens: LienNotion[]
}

export type NotionGroupee = {
  matiere: string
  notion: string
  /** Toutes les semaines où elle revient, dans l'ordre. */
  semaines: number[]
  /** Sa première période. Une notion ne se range qu'à un endroit. */
  periode: number | null
  /** La compétence rattachée, si toutes les semaines s'accordent. */
  competenceId?: string
  /** Deux semaines ne disent pas la même chose : on ne choisit pas à sa place. */
  melange: boolean
  /** Rattachée sur certaines semaines seulement. */
  partiel: boolean
}

export function grouperNotions(entree: EntreeGroupement): NotionGroupee[] {
  const { progression, periodeParSemaine, liens } = entree

  const parNotion = new Map<string, { matiere: string; notion: string; semaines: number[] }>()
  for (const ligne of progression) {
    for (const item of ligne.items ?? []) {
      const notion = (item ?? '').trim()
      if (!notion) continue
      const cle = `${ligne.matiere}|${notion}`
      const groupe = parNotion.get(cle) ?? { matiere: ligne.matiere, notion, semaines: [] }
      if (!groupe.semaines.includes(ligne.numero)) groupe.semaines.push(ligne.numero)
      parNotion.set(cle, groupe)
    }
  }

  // Les compétences posées, par notion, toutes semaines confondues.
  const competencesParNotion = new Map<string, Map<number, string>>()
  for (const lien of liens) {
    const cle = `${lien.matiere}|${lien.notion}`
    const parSemaine = competencesParNotion.get(cle) ?? new Map<number, string>()
    parSemaine.set(lien.semaine_numero, lien.competence_id)
    competencesParNotion.set(cle, parSemaine)
  }

  const notions: NotionGroupee[] = []
  for (const [cle, groupe] of parNotion) {
    const semaines = [...groupe.semaines].sort((a, b) => a - b)
    const periodes = semaines
      .map(s => periodeParSemaine[s] ?? null)
      .filter((p): p is number => p != null)

    const posees = competencesParNotion.get(cle)
    const distinctes = new Set(posees ? [...posees.values()] : [])

    notions.push({
      matiere: groupe.matiere,
      notion: groupe.notion,
      semaines,
      periode: periodes.length > 0 ? Math.min(...periodes) : null,
      competenceId: distinctes.size === 1 ? [...distinctes][0] : undefined,
      melange: distinctes.size > 1,
      partiel: distinctes.size === 1 && (posees?.size ?? 0) < semaines.length,
    })
  }

  return notions.sort((a, b) =>
    a.matiere.localeCompare(b.matiere)
    || (a.periode ?? 99) - (b.periode ?? 99)
    || a.semaines[0] - b.semaines[0]
    || a.notion.localeCompare(b.notion))
}
