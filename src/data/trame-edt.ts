// src/data/trame-edt.ts

/** Code couleur par défaut d'une matière (repère visuel pour l'enseignant). */
export function couleurMatiere(matiere: string): string | null {
  const m = matiere.toLowerCase()
  if (m.includes('graphème') || m.includes('graphe') || m.includes('écriture') ||
      m.includes('ecriture') || m.includes('phono') || m.includes('vocabulaire') ||
      m.includes('lecture-écriture') || m.includes('lecture-ecriture')) return '#dbeafe' // bleu
  if (m.includes('math') || m.includes('calcul')) return '#fbcfe8' // rose
  if (m.includes('arts')) return '#ddd6fe' // violet
  if (m.includes('anglais')) return '#fed7aa' // orange
  if (m.includes('eps')) return '#fef08a' // jaune
  return null // EMC, Histoire géographie, Sciences, Lecture compréhension… : pas de teinte définie
}

type LigneTrame =
  | { debut: string; fin: string; type: 'cours' | 'routine'; commun: string }
  | { debut: string; fin: string; type: 'cours' | 'routine'; parJour: [string, string, string, string] }

const JOURS_TRAME = ['lundi', 'mardi', 'jeudi', 'vendredi'] as const

const LIGNES: LigneTrame[] = [
  { debut: '08:20', fin: '08:30', type: 'routine', commun: 'Accueil dans la cour' },
  { debut: '08:30', fin: '08:45', type: 'routine', commun: 'Rituels du jour, appel…' },
  { debut: '08:45', fin: '09:15', type: 'cours', commun: 'Appropriation des graphèmes' },
  { debut: '09:15', fin: '09:45', type: 'cours', parJour: ['Écriture', 'Phonologie', 'Écriture', 'Phonologie'] },
  { debut: '09:45', fin: '10:00', type: 'cours', parJour: ['Vocabulaire', 'Lecture-écriture', 'Vocabulaire', 'Lecture-écriture'] },
  { debut: '10:00', fin: '10:15', type: 'routine', commun: 'Récréation' },
  { debut: '10:15', fin: '10:30', type: 'cours', commun: 'Calcul mental' },
  { debut: '10:30', fin: '11:30', type: 'cours', commun: 'Mathématiques' },
  { debut: '11:30', fin: '13:20', type: 'routine', commun: 'Pause déjeuner / APC' },
  { debut: '13:20', fin: '13:30', type: 'routine', commun: 'Accueil dans la cour' },
  { debut: '13:30', fin: '13:45', type: 'cours', commun: 'Chut je lis' },
  { debut: '13:45', fin: '14:15', type: 'cours', parJour: ['Lecture compréhension', "Production d'écrits", 'Lecture compréhension', "Production d'écrits"] },
  { debut: '14:15', fin: '14:45', type: 'cours', parJour: ['Histoire géographie', 'Arts visuels', 'Sciences et technologie', 'Anglais'] },
  { debut: '14:45', fin: '15:00', type: 'cours', parJour: ['Écriture', 'Vocabulaire', 'Écriture', 'Vocabulaire'] },
  { debut: '15:00', fin: '15:15', type: 'routine', commun: 'Récréation' },
  { debut: '15:15', fin: '15:45', type: 'cours', parJour: ['EPS', 'Anglais', 'EPS', 'Arts visuels'] },
  { debut: '15:45', fin: '16:15', type: 'cours', parJour: ['EPS', 'EMC', 'EPS', 'EMC'] },
  { debut: '16:15', fin: '16:30', type: 'routine', parJour: ['Bilan de la journée, devoirs, cartable', 'Bilan de la journée, cartable', 'Bilan de la journée, cartable', 'Bilan de la journée, cartable'] },
]

export type CreneauTrame = {
  jour: string
  heure_debut: string
  heure_fin: string
  matiere: string
  type: 'cours' | 'routine'
  couleur: string | null
  ordre: number
}

/** EDT CP par défaut (vraie trame de Cécile), aplati en une ligne par (jour × créneau). */
export const TRAME_EDT_CP: CreneauTrame[] = (() => {
  const out: CreneauTrame[] = []
  let ordre = 0
  for (const ligne of LIGNES) {
    JOURS_TRAME.forEach((jour, idx) => {
      const matiere = 'commun' in ligne ? ligne.commun : ligne.parJour[idx]
      out.push({
        jour,
        heure_debut: ligne.debut,
        heure_fin: ligne.fin,
        matiere,
        type: ligne.type,
        couleur: ligne.type === 'routine' ? '#f3f4f6' : couleurMatiere(matiere),
        ordre: ordre++,
      })
    })
  }
  return out
})()
