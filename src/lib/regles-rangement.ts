import type { CreneauHoraire, JourSemaine, RegleRangement, SeanceProgression } from '@/types'
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

/** Une case que l'enseignante peut choisir pour une règle : son nom, ses jours. */
export type CaseDisponible = { nom: string; jours: JourSemaine[] }

type LigneEdt = Pick<CreneauHoraire, 'jour' | 'matiere' | 'type' | 'visible_journal'>

/**
 * Les cases qu'une règle peut viser : les cases de COURS visibles dans le
 * cahier journal (conception : les routines cachées ne sont pas proposées).
 * Un nom écrit deux fois (« Mathématiques », « mathématiques ») est une seule
 * case, sous sa première écriture rencontrée. Rangées par nom.
 */
export function casesDisponibles(edt: LigneEdt[]): CaseDisponible[] {
  const parCle = new Map<string, CaseDisponible>()
  for (const c of edt) {
    if (c.type !== 'cours' || c.visible_journal === false) continue
    const cle = sansAccents(c.matiere)
    if (!cle) continue
    const k = parCle.get(cle) ?? { nom: c.matiere.trim(), jours: [] }
    if (!k.jours.includes(c.jour)) k.jours.push(c.jour)
    parCle.set(cle, k)
  }
  return [...parCle.values()]
    .map(k => ({ ...k, jours: JOURS_SEMAINE.filter(j => k.jours.includes(j)) }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}

function caseNommee(cases: CaseDisponible[], nom: string): CaseDisponible | undefined {
  const cle = sansAccents(nom)
  return cases.find(k => sansAccents(k.nom) === cle)
}

/** Une règle dont la case n'existe plus, ou plus ce jour-là : signalée en orange. */
export function estRegleSansCase(r: Pick<RegleRangement, 'creneau' | 'jour'>, cases: CaseDisponible[]): boolean {
  const k = caseNommee(cases, r.creneau)
  return !k || (r.jour !== null && !k.jours.includes(r.jour))
}

export type GroupeRegles = { creneau: string; jour: JourSemaine | null; regles: RegleRangement[] }

/** Pour l'affichage : une ligne par case et par jour, les types regroupés. */
export function regrouperRegles(regles: RegleRangement[]): GroupeRegles[] {
  const groupes = new Map<string, GroupeRegles>()
  for (const r of regles) {
    const cle = `${sansAccents(r.creneau)}|${r.jour ?? ''}`
    const g = groupes.get(cle) ?? { creneau: r.creneau, jour: r.jour, regles: [] }
    g.regles.push(r)
    groupes.set(cle, g)
  }
  const rangJour = (j: JourSemaine | null) => (j === null ? -1 : JOURS_SEMAINE.indexOf(j))
  return [...groupes.values()].sort((a, b) =>
    a.creneau.localeCompare(b.creneau, 'fr') || rangJour(a.jour) - rangJour(b.jour))
}

export type RegleAEnregistrer = { type: string; type_cle: string; creneau: string; jour: JourSemaine | null }

/**
 * Vérifie une règle avant de l'enregistrer, contre l'emploi du temps de la
 * classe. Le message est écrit pour l'enseignante.
 */
export function preparerRegle(
  entree: { type: string; creneau: string; jour: JourSemaine | null },
  cases: CaseDisponible[],
): { ok: true; valeur: RegleAEnregistrer } | { ok: false; message: string } {
  const type = entree.type.trim()
  const type_cle = cleType(type)
  if (!type || !type_cle) return { ok: false, message: 'Écris ce que tu ranges (par exemple « Chant »).' }
  if (type.length > 80) return { ok: false, message: 'Ce nom est trop long : 80 caractères au plus.' }
  const k = caseNommee(cases, entree.creneau)
  if (!k) return { ok: false, message: `Je ne trouve pas de case « ${entree.creneau.trim()} » dans ton emploi du temps.` }
  if (entree.jour !== null && !k.jours.includes(entree.jour)) {
    return { ok: false, message: `Ta case « ${k.nom} » n’existe pas le ${entree.jour}.` }
  }
  return { ok: true, valeur: { type, type_cle, creneau: k.nom, jour: entree.jour } }
}

const ORIGINES: readonly RegleRangement['origine'][] = ['main', 'cahier', 'ia']

/** Les lignes complètes de la base, pour Paramètres. */
export function lireReglesCompletes(v: unknown): RegleRangement[] {
  if (!Array.isArray(v)) return []
  return v.flatMap((brut): RegleRangement[] => {
    const o = (brut ?? {}) as Record<string, unknown>
    const texte = (x: unknown) => (typeof x === 'string' ? x.trim() : '')
    const [id, class_id, type, type_cle, creneau] = [o.id, o.class_id, o.type, o.type_cle, o.creneau].map(texte)
    if (!id || !class_id || !type || !type_cle || !creneau) return []
    const origine = ORIGINES.find(x => x === o.origine) ?? 'main'
    return [{ id, class_id, type, type_cle, creneau, jour: estJourSemaine(o.jour) ? o.jour : null, origine }]
  })
}
