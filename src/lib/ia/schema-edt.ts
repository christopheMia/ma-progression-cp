/**
 * Schema de sortie pour l'import d'un emploi du temps depuis un PDF.
 *
 * Motivation (20/07) : le generateur construit un EDT depuis les volumes
 * officiels, mais chaque enseignante a DEJA sa propre organisation. L'exemple
 * fourni (`partage/edt.pdf`) le montre : journee 8h20-16h30, rituels de 5 min,
 * creneaux de 20 a 30 min, intitules personnels ("Chaque jour compte", "Chut je
 * lis", "Flash maths"). Aucun generateur ne devinera ca : il faut pouvoir
 * importer sa grille telle quelle.
 */

export const EDT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    creneaux: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          jour: { type: 'string', enum: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] },
          heure_debut: { type: 'string' },
          heure_fin: { type: 'string' },
          matiere: { type: 'string' },
          // routine = accueil, rituel, recreation, repas : pas de deroulement
          // dans le cahier journal.
          type: { type: 'string', enum: ['cours', 'routine'] },
        },
        required: ['jour', 'heure_debut', 'heure_fin', 'matiere', 'type'],
      },
    },
  },
  required: ['creneaux'],
} as const

export type CreneauImporte = {
  jour: string
  heure_debut: string
  heure_fin: string
  matiere: string
  type: 'cours' | 'routine'
}

const JOURS_VALIDES = new Set(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'])

/** Normalise "8h20", "08:20", "8:20" -> "08:20". Renvoie null si illisible. */
export function normaliserHeure(brut: unknown): string | null {
  if (typeof brut !== 'string') return null
  const m = brut.trim().toLowerCase().match(/^(\d{1,2})\s*[h:]\s*(\d{0,2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = m[2] === '' ? 0 : Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/**
 * Nettoie la sortie du modele : heures normalisees, jours valides, creneaux
 * incoherents ecartes, tri chronologique, `ordre` recalcule.
 * On prefere ECARTER une ligne douteuse plutot que d'inserer une grille cassee.
 */
export function normaliserEdtImporte(brut: unknown[]): CreneauImporte[] {
  const lignes = Array.isArray(brut) ? brut : []
  const propres: CreneauImporte[] = []

  for (const raw of lignes) {
    const o = (raw ?? {}) as Record<string, unknown>
    const jour = typeof o.jour === 'string' ? o.jour.trim().toLowerCase() : ''
    const debut = normaliserHeure(o.heure_debut)
    const fin = normaliserHeure(o.heure_fin)
    const matiere = typeof o.matiere === 'string' ? o.matiere.trim() : ''

    if (!JOURS_VALIDES.has(jour) || !debut || !fin || !matiere) continue
    if (debut >= fin) continue // creneau vide ou inverse

    propres.push({
      jour,
      heure_debut: debut,
      heure_fin: fin,
      matiere,
      type: o.type === 'routine' ? 'routine' : 'cours',
    })
  }

  const rang = (j: string) =>
    ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'].indexOf(j)
  propres.sort((a, b) =>
    rang(a.jour) - rang(b.jour) || a.heure_debut.localeCompare(b.heure_debut))
  return propres
}
