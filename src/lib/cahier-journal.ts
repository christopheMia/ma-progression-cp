import { CreneauHoraire, JourJournal, SeanceJournal, ProgressionMatiere } from '@/types'

const JOURS_ORDRE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const

/**
 * Devine le code matière d'une progression à partir du libellé d'un créneau
 * de l'emploi du temps (ex : "Appropriation des graphèmes" -> "francais",
 * "Calcul mental" -> "maths"). Sert de repli quand le créneau n'a pas encore
 * été relié manuellement à une méthode, pour que le cahier journal se remplisse
 * quand même. Renvoie null si aucun rapprochement évident.
 */
function codeMatiereDepuisLibelle(libelle: string): string | null {
  const m = libelle.toLowerCase()
  if (m.includes('graphème') || m.includes('grapheme') || m.includes('graphe') ||
      m.includes('écriture') || m.includes('ecriture') || m.includes('phono') ||
      m.includes('vocabulaire') || m.includes('lecture')) return 'francais'
  if (m.includes('math') || m.includes('calcul')) return 'maths'
  return null
}

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
  // Repli 1 : rapprochement par mots-clés (français / maths)
  const code = codeMatiereDepuisLibelle(creneau.matiere)
  if (code) {
    const p = progression.find(x => x.matiere === code)
    if (p) return p
  }
  // Repli 2 : correspondance directe du libellé (matières personnalisées)
  const norm = creneau.matiere.trim().toLowerCase()
  return progression.find(x => x.matiere.trim().toLowerCase() === norm) ?? null
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
