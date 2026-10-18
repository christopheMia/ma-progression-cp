import type { CreneauHoraire, JourSemaine, SeanceProgression } from '@/types'
import { sansAccents } from '@/data/trame-edt'
import { mots } from '@/lib/familles-seances'
import { domaineAbrege, domaineDe } from '@/lib/progression-seances'
import { domainesNotion } from '@/lib/notions-creneaux'

/**
 * Le carnet de rangement : des règles par type, « Chant va dans Musique »,
 * que le cahier journal lit EN PREMIER (conception validée par Christophe le
 * 18/10/2026, docs/superpowers/specs/2026-10-18-carnet-de-rangement-design.md).
 *
 * Ce module est pur : ni base, ni réseau. Il dit quelle règle vaut pour une
 * séance ou une notion, et si une case est celle d'une règle. Le placement
 * lui-même vit dans `cahier-journal.ts` et `notions-creneaux.ts`.
 */

export const JOURS_SEMAINE: readonly JourSemaine[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']

/** Ce que le cahier journal a besoin de savoir d'une règle. */
export type RegleAppliquee = { type: string; creneau: string; jour: JourSemaine | null }

export function estJourSemaine(v: unknown): v is JourSemaine {
  return typeof v === 'string' && (JOURS_SEMAINE as readonly string[]).includes(v)
}

/**
 * Le type comparé : l'abréviation de Cécile si elle en a une (« Lecture
 * compréhension » et « LC » sont le même type), puis la lecture `mots` de
 * `familles-seances.ts` (sans accents, sans la marque du pluriel).
 */
export function cleType(type: string): string {
  return mots(domaineAbrege(type.trim()))
}

/** Les règles par clé de type. Une clé vide n'est jamais indexée. */
export function indexerRegles(regles: RegleAppliquee[]): Map<string, RegleAppliquee> {
  const index = new Map<string, RegleAppliquee>()
  for (const r of regles) {
    const cle = cleType(r.type)
    if (cle && !index.has(cle)) index.set(cle, r)
  }
  return index
}

/** Le type d'une séance : son domaine s'il est rempli, sinon le texte avant les deux points. */
export function regleDeSeance(s: SeanceProgression, index: Map<string, RegleAppliquee>): RegleAppliquee | undefined {
  if (index.size === 0) return undefined
  const cle = cleType(s.domaine || domaineDe(s.libelle))
  return cle ? index.get(cle) : undefined
}

/** Le type d'une notion : chacun de ses domaines ; le premier qui a une règle l'emporte. */
export function regleDeNotion(notion: string, index: Map<string, RegleAppliquee>): RegleAppliquee | undefined {
  if (index.size === 0) return undefined
  for (const d of domainesNotion(notion)) {
    const r = index.get(cleType(d))
    if (r) return r
  }
  return undefined
}

/** Vrai pour une case de cours qui porte le nom de la case de la règle. Le jour se juge à part. */
export function estCaseDeRegle(c: CreneauHoraire, r: RegleAppliquee): boolean {
  return c.type === 'cours' && sansAccents(c.matiere) === sansAccents(r.creneau)
}

/**
 * Les règles lues en base, sans jamais faire échouer le cahier journal : une
 * ligne mal formée est écartée, un jour illisible devient « aucun jour ».
 */
export function lireRegles(v: unknown): RegleAppliquee[] {
  if (!Array.isArray(v)) return []
  return v.flatMap((brut): RegleAppliquee[] => {
    const o = (brut ?? {}) as Record<string, unknown>
    const type = typeof o.type === 'string' ? o.type.trim() : ''
    const creneau = typeof o.creneau === 'string' ? o.creneau.trim() : ''
    if (!type || !creneau) return []
    return [{ type, creneau, jour: estJourSemaine(o.jour) ? o.jour : null }]
  })
}
