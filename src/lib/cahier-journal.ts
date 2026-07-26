import { CreneauHoraire, JourJournal, SeanceJournal, ProgressionMatiere } from '@/types'
import { trouverProgressionMatiere } from '@/lib/matieres'

const JOURS_ORDRE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const

/**
 * Trouve la ligne de progression qui alimente un créneau : d'abord par lien
 * explicite (methode_id), puis par repli sur le nom de la matière.
 */
function progressionPourCreneau(
  creneau: CreneauHoraire,
  progression: ProgressionMatiere[],
): ProgressionMatiere | null {
  if (creneau.methode_id) {
    return progression.find(x => x.methode_id === creneau.methode_id) ?? null
  }
  return trouverProgressionMatiere(progression, creneau.matiere) ?? null
}

function deroulementInitial(creneau: CreneauHoraire, progression: ProgressionMatiere[]): string {
  if (creneau.type === 'routine') return ''
  const p = progressionPourCreneau(creneau, progression)
  if (!p || p.items.length === 0) return ''
  const items = p.items.join(', ')
  const pages = p.pages ? ` — ${p.pages}` : ''
  const mots = p.mots_exemple && p.mots_exemple.length ? ` (mots : ${p.mots_exemple.join(', ')})` : ''
  return `${items}${pages}${mots}`
}

export function genererCahierJournal(
  emploiDuTemps: CreneauHoraire[],
  progression: ProgressionMatiere[],
): JourJournal[] {
  const parJour = new Map<string, CreneauHoraire[]>()
  for (const c of emploiDuTemps) {
    if (c.visible_journal === false) continue
    const list = parJour.get(c.jour) ?? []
    list.push(c)
    parJour.set(c.jour, list)
  }

  return JOURS_ORDRE
    .filter(jour => parJour.has(jour))
    .map(jour => ({
      jour,
      seances: (parJour.get(jour) ?? [])
        .sort((a, b) => a.ordre - b.ordre)
        .map((c): SeanceJournal => ({
          matiere: c.matiere,
          heure_debut: c.heure_debut,
          heure_fin: c.heure_fin,
          type: c.type,
          deroulement: deroulementInitial(c, progression),
        })),
    }))
}
