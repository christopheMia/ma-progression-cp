import { sansAccents } from '@/data/trame-edt'
import { estJourSemaine, type CaseDisponible } from '@/lib/regles-rangement'
import type { JourSemaine } from '@/types'

/**
 * L'appel « avec mes mots » (carnet de rangement, conception du 18/10/2026) :
 * l'enseignante dit où elle fait une séance, l'IA en fait une règle.
 *
 * Le code ne fait jamais confiance au nom de case rendu : il le cherche dans
 * l'emploi du temps. Une case inventée devient « introuvable », jamais une
 * règle. Rien n'est enregistré ici : c'est son « C'est ça » qui enregistre.
 */
export const REGLE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    statut: { type: 'string', enum: ['regle', 'introuvable', 'incompris'] },
    type: { type: 'string' },
    creneau: { type: 'string' },
    jour: { type: 'string', enum: ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] },
    plus_proche: { type: 'string' },
  },
  required: ['statut', 'type', 'creneau', 'jour', 'plus_proche'],
} as const

export type RegleComprise = { type: string; creneau: string; jour: JourSemaine | null }

export type ReponseRegle =
  | { statut: 'regle'; regle: RegleComprise }
  | {
      statut: 'introuvable'
      type: string
      demande: string
      /** La case demandée existe, mais pas le jour demandé (essai du 18/10 : « Musique le jeudi »). */
      jourAbsent: { creneau: string; jour: JourSemaine } | null
      /** `jours` : ceux où la case a lieu, pour que la question dise QUEL jour. */
      plusProche: { creneau: string; jour: JourSemaine | null; jours: JourSemaine[] } | null
    }
  | { statut: 'incompris' }

export function lireReponseRegle(brut: unknown, cases: CaseDisponible[], typeConnu?: string): ReponseRegle {
  if (!brut || typeof brut !== 'object') return { statut: 'incompris' }
  const o = brut as Record<string, unknown>
  const texte = (x: unknown) => (typeof x === 'string' ? x.trim() : '')
  const type = typeConnu?.trim() || texte(o.type)
  if (o.statut === 'incompris' || !type) return { statut: 'incompris' }
  if (o.statut !== 'regle' && o.statut !== 'introuvable') return { statut: 'incompris' }

  const jour = estJourSemaine(o.jour) ? o.jour : null
  const nommee = (nom: string) => cases.find(k => sansAccents(k.nom) === sansAccents(nom) && sansAccents(nom) !== '')
  const demandee = nommee(texte(o.creneau))
  if (demandee && (jour === null || demandee.jours.includes(jour))) {
    return { statut: 'regle', regle: { type, creneau: demandee.nom, jour } }
  }
  const proche = nommee(texte(o.plus_proche)) ?? demandee
  const demande = texte(o.creneau)
  return {
    statut: 'introuvable',
    type,
    demande: demande && jour ? `${demande} le ${jour}` : demande,
    jourAbsent: demandee && jour ? { creneau: demandee.nom, jour } : null,
    plusProche: proche
      ? { creneau: proche.nom, jour: jour && proche.jours.includes(jour) ? jour : null, jours: proche.jours }
      : null,
  }
}
