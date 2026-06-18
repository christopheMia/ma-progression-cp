import { CreneauHoraire, JourJournal, SeanceJournal, ProgressionMatiere } from '@/types'

const JOURS_ORDRE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const

/** Mappe un libellé de créneau vers la matière-méthode correspondante (ou null). */
export function matiereMethode(matiere: string): 'francais' | 'maths' | null {
  const m = matiere.toLowerCase()
  if (m.includes('graphème') || m.includes('graphe')) return 'francais'
  if (m.includes('math') || m.includes('calcul')) return 'maths'
  return null
}

function deroulementInitial(creneau: CreneauHoraire, progression: ProgressionMatiere[]): string {
  if (creneau.type === 'routine') return ''
  const matiere = matiereMethode(creneau.matiere)
  if (!matiere) return ''
  const p = progression.find(x => x.matiere === matiere)
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
