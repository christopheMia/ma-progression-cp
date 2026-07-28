/**
 * Comment s'est passée la semaine : trois états, une seule pastille.
 *
 * Décision de Christophe du 28/07/2026. Une pastille, et pour le
 * comportement. L'absence d'état veut dire « rien de noté », ce qui n'est pas
 * la même chose qu'une semaine difficile : on ne remplit pas les trous.
 */

export type EtatComportement = 'difficile' | 'attention' | 'bien'

export const ETATS_COMPORTEMENT: EtatComportement[] = ['difficile', 'attention', 'bien']

export const LIBELLE_COMPORTEMENT: Record<EtatComportement, string> = {
  difficile: 'Difficile',
  attention: 'À surveiller',
  bien: 'Ça va bien',
}

export function estEtatComportement(valeur: unknown): valeur is EtatComportement {
  return typeof valeur === 'string' && (ETATS_COMPORTEMENT as string[]).includes(valeur)
}

export type ResumeComportement = {
  bien: number
  attention: number
  difficile: number
  /** Semaines de la période sans rien de noté. */
  vides: number
  /** Une phrase lisible, ou '' si rien n'a été noté. */
  phrase: string
}

/**
 * Le résumé d'une période, tel qu'il se lira dans le bilan.
 *
 * On ne compte QUE ce qui a été noté. Une période à moitié remplie ne se
 * raconte pas comme une période difficile.
 */
export function resumerComportement(
  etats: (EtatComportement | null)[],
): ResumeComportement {
  const resume = { bien: 0, attention: 0, difficile: 0, vides: 0, phrase: '' }
  for (const etat of etats) {
    if (etat === null) resume.vides++
    else resume[etat]++
  }

  const bouts: string[] = []
  if (resume.bien > 0) {
    bouts.push(resume.bien > 1
      ? `${resume.bien} semaines qui se sont bien passées`
      : '1 semaine qui s’est bien passée')
  }
  if (resume.attention > 0) {
    bouts.push(`${resume.attention} à surveiller`)
  }
  if (resume.difficile > 0) {
    bouts.push(resume.difficile > 1 ? `${resume.difficile} difficiles` : '1 difficile')
  }
  resume.phrase = bouts.length > 0 ? bouts.join(', ') : ''
  return resume
}

/**
 * La brique de posture proposée pour l'appréciation générale.
 *
 * Elle décrit la période, pas l'enfant, et se complète après « Elle » ou
 * « Il ». Rendue vide quand rien n'a été noté : on n'invente pas une posture
 * (règle 3 du modèle de rédaction).
 */
export function posturePour(resume: ResumeComportement): string {
  const notees = resume.bien + resume.attention + resume.difficile
  if (notees === 0) return ''

  // Aucun adjectif accorde dans ces phrases : elles se completent apres « Elle »
  // ou « Il », et « serein / sereine » obligerait a connaitre le genre ici.
  if (resume.difficile === 0 && resume.attention === 0) {
    return 'a gardé le même sérieux tout au long de la période'
  }
  if (resume.bien >= resume.attention + resume.difficile) {
    return 'a globalement bien travaillé, avec quelques semaines plus fragiles'
  }
  if (resume.difficile > resume.bien) {
    return 'a traversé une période difficile'
  }
  return 'a connu une période irrégulière'
}
