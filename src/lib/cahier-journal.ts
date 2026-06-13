import { Semaine, CreneauHoraire, JourJournal, SeanceJournal } from '@/types'

const JOURS_ORDRE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const

function creerSeance(creneau: CreneauHoraire, semaine: Semaine): SeanceJournal {
  const base = {
    matiere: creneau.matiere,
    heure_debut: creneau.heure_debut,
    heure_fin: creneau.heure_fin,
    materiel: '',
    note: '',
  }
  if (creneau.matiere === 'Lecture') {
    return {
      ...base,
      objectif: `Découvrir et lire le graphème "${semaine.graphemes.join(', ')}"`,
      activite: `Manuel ${semaine.manuel_pages ?? ''} — mots exemples : ${(semaine.mots_exemple ?? []).join(', ')}`,
    }
  }
  if (creneau.matiere === 'Explorer le monde') {
    return {
      ...base,
      objectif: `${semaine.edm_theme}`,
      activite: semaine.edm_competences,
    }
  }
  return { ...base, objectif: '', activite: '' }
}

export function genererCahierJournal(semaine: Semaine, emploiDuTemps: CreneauHoraire[]): JourJournal[] {
  const parJour = new Map<string, CreneauHoraire[]>()
  for (const creneau of emploiDuTemps) {
    const list = parJour.get(creneau.jour) ?? []
    list.push(creneau)
    parJour.set(creneau.jour, list)
  }

  return JOURS_ORDRE
    .filter(jour => parJour.has(jour))
    .map(jour => ({
      jour,
      seances: (parJour.get(jour) ?? [])
        .sort((a, b) => a.ordre - b.ordre)
        .map(c => creerSeance(c, semaine)),
    }))
}
