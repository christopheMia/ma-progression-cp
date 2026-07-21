// src/data/trame-edt.ts

/**
 * Couleurs par FAMILLE de matière, pas par libellé.
 *
 * « Geste d'écriture », « Vocabulaire » et « Lecture compréhension » sont tous
 * du français, donc tous bleus : l'enseignante repère la structure de sa
 * journée d'un coup d'oeil, quel que soit l'intitulé venu de son manuel.
 *
 * Ce ne sont que des valeurs par DEFAUT : la couleur choisie à la main est
 * stockée sur le créneau et l'emporte toujours (voir `couleurAffichee`).
 */
export const COULEURS_FAMILLE = {
  francais: '#dbeafe',      // bleu
  maths: '#fbcfe8',         // rose
  qlm: '#d5f0dc',           // vert
  eps: '#fdf0a4',           // jaune
  arts: '#e4dcfb',          // violet
  langueVivante: '#fee0c4', // orange
  emc: '#cfeef0',           // sarcelle
  routine: '#f1eff5',       // gris
} as const

/** Enlève les accents : les libellés générés n'en ont pas, ceux des PDF si. */
function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Règles ordonnées : la première qui matche gagne. L'ordre compte, les cas
 * ambigus sont placés avant leur famille générique.
 *  - « histoire des arts » avant « histoire » (arts, pas questionner le monde)
 *  - « langue vivante » avant le français (« étude de la langue » reste français)
 *  - « enseignements artistiques » ne doit pas être capté par « moral et civique »
 */
const REGLES: Array<[RegExp, string]> = [
  // Routines et temps non disciplinaires.
  [/recre|accueil|cantine|dejeuner|repas|rangement|cartable|bilan de la journee|\bapc\b|temps calme/, COULEURS_FAMILLE.routine],

  // Cas ambigus, avant les familles génériques.
  [/histoire des arts/, COULEURS_FAMILLE.arts],
  [/langue vivante|anglais/, COULEURS_FAMILLE.langueVivante],

  // « artistiques » ne contient pas la sous-chaîne « arts », d'où les deux formes.
  [/arts|artistique|musique|chant|chorale/, COULEURS_FAMILLE.arts],
  [/\beps\b|education physique|sportive|motricite|natation|piscine/, COULEURS_FAMILLE.eps],
  [/\bemc\b|moral et civique|conseil d.eleves|debat philo/, COULEURS_FAMILLE.emc],
  [/questionner le monde|histoire|geographie|science|technologie|le vivant|la matiere|espace|le temps/, COULEURS_FAMILLE.qlm],
  [/math|calcul|probleme|numeration|geometrie|grandeur|mesure|chaque jour compte/, COULEURS_FAMILLE.maths],

  // Français en dernier : c'est la famille la plus large.
  // `lc` et `pde` sont les abréviations employées dans le planning du manuel
  // (« LC : La petite poule… », « PDE : Voyelles, de Rimbaud »).
  [/francais|graphem|graphe|ecriture|phono|vocabulaire|lecture|comprehension|production d.ecrit|langage oral|grammaire|orthographe|conjugaison|dictee|fluence|poesie|encodage|decodage|etude de la langue|chut je lis|rituel|\blc\b|\bpde\b/, COULEURS_FAMILLE.francais],
]

/**
 * Couleur par défaut d'une matière, d'après sa famille.
 * Renvoie `null` si aucune famille ne correspond : la cellule reste neutre
 * plutôt que de recevoir une couleur arbitraire et trompeuse.
 */
export function couleurMatiere(matiere: string): string | null {
  const m = sansAccents(matiere)
  for (const [regle, couleur] of REGLES) if (regle.test(m)) return couleur
  return null
}

/**
 * Couleur réellement affichée pour un créneau.
 *
 * La couleur enregistrée l'emporte toujours : elle vient d'un choix explicite
 * de l'enseignante et ne doit jamais être écrasée. La palette ne sert que de
 * repli pour les créneaux qui n'en ont aucune, ce qui fait bénéficier les
 * emplois du temps déjà en base des familles ajoutées depuis, sans migration.
 */
export function couleurAffichee(
  creneau: { matiere: string; couleur?: string | null; type?: 'cours' | 'routine' },
): string | null {
  if (creneau.couleur) return creneau.couleur
  if (creneau.type === 'routine') return COULEURS_FAMILLE.routine
  return couleurMatiere(creneau.matiere)
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
