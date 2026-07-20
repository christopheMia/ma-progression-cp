// src/lib/edt-generator.ts
//
// Genere un emploi du temps CP a partir du volume horaire officiel (cycle 2),
// selon les regles validees avec Christophe (19/07/2026) :
//  - repartition selon le volume horaire, recre 30 min/jour deduite equitablement
//    (facteur d'echelle commun applique a toutes les matieres),
//  - matin = priorite etude du code + etude de la langue + maths,
//    avec un bloc CODE garanti chaque matin (code renforce CP),
//  - recres fixes 10h00-10h15 et 15h00-15h15, rituel a chaque entree,
//    retour de cantine 13h30 = temps calme lecture 15 min,
//  - sortie 100% editable ensuite (meme forme que TRAME_EDT_CP).
//
// Fonction pure : aucun effet de bord, aucune dependance base. Voir la spec
// docs/superpowers/specs/2026-07-19-emploi-du-temps-genere-design.md.

import { couleurMatiere, type CreneauTrame } from '@/data/trame-edt'

export const JOURS_EDT = ['lundi', 'mardi', 'jeudi', 'vendredi'] as const

// ── Volume horaire officiel cycle 2 (arrete 9/11/2015), en minutes/semaine ──
export const VOLUME_OFFICIEL_CP = {
  francais: 600, // 10 h
  maths: 300,    // 5 h
  qlm: 150,      // 2 h 30 (questionner le monde, dont EMC)
  eps: 180,      // 3 h
  arts: 120,     // 2 h
  langueVivante: 90, // 1 h 30
} as const

// Total nominal = 1440 min (24 h). Le cadre de journee ci-dessous ne degage que
// TEMPS_COURS_SEMAINE minutes de cours effectif ; on met donc toutes les matieres
// a l'echelle par le meme facteur (deduction equitable de la recre + rituels).

// ── Cadre de journee par defaut (validated), en minutes depuis minuit ────────
const H = (h: number, m = 0) => h * 60 + m

/** Une plage de cours (hors rituel/recre/dejeuner), decoupable en matieres. */
type PlageCours = { debut: number; fin: number; periode: 'matin' | 'aprem' }

const CADRE = {
  rituelMatin: { debut: H(8, 30), fin: H(8, 45) },
  recreMatin: { debut: H(10, 0), fin: H(10, 15) },
  dejeuner: { debut: H(11, 30), fin: H(13, 30) },
  tempsCalme: { debut: H(13, 30), fin: H(13, 45) }, // lecture, retour cantine
  recreAprem: { debut: H(15, 0), fin: H(15, 15) },
  plages: [
    { debut: H(8, 45), fin: H(10, 0), periode: 'matin' },
    { debut: H(10, 15), fin: H(11, 30), periode: 'matin' },
    { debut: H(13, 45), fin: H(15, 0), periode: 'aprem' },
    { debut: H(15, 15), fin: H(16, 30), periode: 'aprem' },
  ] as PlageCours[],
}

function hhmm(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Un segment de matiere a placer : nom affiche + duree (min) sur la semaine. */
type Segment = { matiere: string; minutes: number }

/**
 * Construit les files de matieres a placer, mises a l'echelle sur le budget de
 * cours effectif. "Code renforce" : le francais est scinde en Etude du code
 * (majoritaire, matin) et Etude de la langue ; un bloc code est garanti chaque
 * matin (gere separement dans genererEdtCP).
 */
export function repartirVolumes(codeRenforce: boolean): {
  budgetCours: number
  facteur: number
  codeMatinQuotidien: number
  fileMatin: Segment[]
  fileAprem: Segment[]
} {
  const plageMin = (p: 'matin' | 'aprem') =>
    CADRE.plages.filter(x => x.periode === p).reduce((s, x) => s + (x.fin - x.debut), 0)
  const matinParJour = plageMin('matin') // 150 min
  const apremParJour = plageMin('aprem') // 150 min
  const nbJours = JOURS_EDT.length
  const budgetCours = (matinParJour + apremParJour) * nbJours // 20 h = 1200 min

  const nominal = Object.values(VOLUME_OFFICIEL_CP).reduce((s, v) => s + v, 0) // 1440
  const facteur = budgetCours / nominal // ~0.8333

  const round15 = (m: number) => Math.round(m / 15) * 15
  const francais = round15(VOLUME_OFFICIEL_CP.francais * facteur) // ~500
  const maths = round15(VOLUME_OFFICIEL_CP.maths * facteur)       // ~250
  const qlm = round15(VOLUME_OFFICIEL_CP.qlm * facteur)           // ~125
  const eps = round15(VOLUME_OFFICIEL_CP.eps * facteur)           // ~150
  const arts = round15(VOLUME_OFFICIEL_CP.arts * facteur)         // ~100
  const lv = round15(VOLUME_OFFICIEL_CP.langueVivante * facteur)  // ~75

  // Bloc code garanti chaque matin = SEUL le premier creneau du matin (75 min),
  // pas toute la matinee (sinon on sur-deduit le francais).
  const premierePlageMatin = CADRE.plages[0].fin - CADRE.plages[0].debut // 75 min
  const codeMatinQuotidien = codeRenforce ? premierePlageMatin : 0
  const codeTotal = codeMatinQuotidien * nbJours // 300 min
  // Le reste du francais devient l'etude de la langue.
  const langue = Math.max(0, francais - codeTotal)

  // Matin (apres le bloc code garanti) : maths d'abord, puis langue.
  const fileMatin: Segment[] = [
    { matiere: 'Mathematiques', minutes: maths },
    { matiere: 'Etude de la langue (francais)', minutes: langue },
  ]
  // Apres-midi : le reste (langue debordante geree par le placement), puis les
  // matieres d'apres-midi.
  const fileAprem: Segment[] = [
    { matiere: 'Questionner le monde', minutes: qlm },
    { matiere: 'Education physique et sportive', minutes: eps },
    { matiere: 'Enseignements artistiques', minutes: arts },
    { matiere: 'Langue vivante (anglais)', minutes: lv },
  ]

  return { budgetCours, facteur, codeMatinQuotidien, fileMatin, fileAprem }
}

/** Formate une duree en minutes : 90 -> "1 h 30", 60 -> "1 h", 45 -> "45 min". */
export function formatDuree(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${String(m).padStart(2, '0')}`
}

export type LigneVolume = {
  matiere: string
  /** Volume officiel hebdomadaire (arrete du 9/11/2015), en minutes. */
  officiel: number | null
  /** Volume reellement place dans la grille, en minutes. */
  retenu: number
}

export type ExplicationEdt = {
  jours: string[]
  journee: { debut: string; fin: string }
  budgetCours: number
  /** Facteur d'echelle applique aux volumes officiels (recres + rituels deduits). */
  facteur: number
  volumes: LigneVolume[]
  cadre: { libelle: string; horaire: string }[]
  regles: string[]
}

/**
 * Decrit EXACTEMENT ce que le generateur prend en compte, en relisant les memes
 * calculs que `genererEdtCP`. Sert la fenetre d'explication affichee avant la
 * generation : l'enseignante doit pouvoir verifier les regles AVANT de remplacer
 * son emploi du temps. Les chiffres sont derives du code, jamais reecrits a la
 * main, donc l'explication ne peut pas diverger du comportement reel.
 */
export function expliquerGenerationEdt(codeRenforce = true): ExplicationEdt {
  const { budgetCours, facteur, codeMatinQuotidien, fileMatin, fileAprem } =
    repartirVolumes(codeRenforce)
  const nbJours = JOURS_EDT.length

  const trouver = (prefixe: string, file: Segment[]) =>
    file.find(s => s.matiere.startsWith(prefixe))?.minutes ?? 0

  const codeTotal = codeMatinQuotidien * nbJours
  const langue = trouver('Etude de la langue', fileMatin)

  const volumes: LigneVolume[] = [
    { matiere: 'Français : étude du code (lecture, graphèmes)', officiel: null, retenu: codeTotal },
    { matiere: 'Français : étude de la langue', officiel: null, retenu: langue },
    { matiere: 'Français (total)', officiel: VOLUME_OFFICIEL_CP.francais, retenu: codeTotal + langue },
    { matiere: 'Mathématiques', officiel: VOLUME_OFFICIEL_CP.maths, retenu: trouver('Mathematiques', fileMatin) },
    { matiere: 'Questionner le monde (dont EMC)', officiel: VOLUME_OFFICIEL_CP.qlm, retenu: trouver('Questionner', fileAprem) },
    { matiere: 'Éducation physique et sportive', officiel: VOLUME_OFFICIEL_CP.eps, retenu: trouver('Education physique', fileAprem) },
    { matiere: 'Enseignements artistiques', officiel: VOLUME_OFFICIEL_CP.arts, retenu: trouver('Enseignements artistiques', fileAprem) },
    { matiere: 'Langue vivante (anglais)', officiel: VOLUME_OFFICIEL_CP.langueVivante, retenu: trouver('Langue vivante', fileAprem) },
  ]

  const plage = (p: { debut: number; fin: number }) => `${hhmm(p.debut)} - ${hhmm(p.fin)}`

  return {
    jours: [...JOURS_EDT],
    journee: { debut: hhmm(CADRE.rituelMatin.debut), fin: hhmm(CADRE.plages[CADRE.plages.length - 1].fin) },
    budgetCours,
    facteur,
    volumes,
    cadre: [
      { libelle: 'Rituels du jour (accueil, appel, date)', horaire: plage(CADRE.rituelMatin) },
      { libelle: 'Récréation du matin', horaire: plage(CADRE.recreMatin) },
      { libelle: 'Pause déjeuner / cantine', horaire: plage(CADRE.dejeuner) },
      { libelle: 'Temps calme (lecture, retour de cantine)', horaire: plage(CADRE.tempsCalme) },
      { libelle: "Récréation de l'après-midi", horaire: plage(CADRE.recreAprem) },
    ],
    regles: [
      `Semaine de ${nbJours} jours : ${JOURS_EDT.join(', ')}.`,
      'Point de départ : le volume horaire officiel du cycle 2 (arrêté du 9 novembre 2015).',
      `Les récréations et les rituels sont déduits équitablement : chaque matière est mise à l'échelle par le même facteur (${Math.round(facteur * 100)} %), personne n'est sacrifié.`,
      'Les durées sont arrondies au quart d\'heure pour rester posables dans une vraie journée.',
      codeRenforce
        ? `Code renforcé CP : un bloc d'étude du code est garanti CHAQUE matin (${formatDuree(codeMatinQuotidien)}), en tout début de matinée.`
        : 'Code renforcé désactivé : le français n\'est pas scindé en code / étude de la langue.',
      'Priorité au matin pour les apprentissages fondamentaux : code, puis mathématiques, puis étude de la langue.',
      `EPS, arts et histoire : jamais plus de ${formatDuree(MINUTES_MAX_JOUR_SEANCE_COURTE)} sur une même journée, pour que ces matières reviennent souvent plutôt qu'en un seul gros bloc.`,
      `Matières générales (français, mathématiques, questionner le monde, langue vivante) : jamais plus de ${formatDuree(MINUTES_MAX_JOUR_GENERAL)} sur une même journée.`,
      'Si une contrainte empêche de remplir un créneau, il reste vide et modifiable plutôt que d\'enfreindre la règle.',
      "L'après-midi reçoit le reste : questionner le monde, EPS, arts, langue vivante.",
      'Tous les matins de la semaine sont remplis avant les après-midi, pour qu\'une matière du matin ne déborde pas trop tôt.',
      'Le résultat est 100 % modifiable ensuite : horaires, matières, couleurs.',
    ],
  }
}

// ── Contraintes de repartition (regles validees avec Christophe le 20/07) ────
//
// Une matiere ne doit pas s'empiler sur une meme journee : mieux vaut 1 h d'EPS
// quatre fois dans la semaine que 2 h le mardi et rien ailleurs. Les matieres a
// seance courte (EPS, arts, histoire) sont plafonnees plus bas que les matieres
// generales, conformement a la pratique en CP.

/** Plafond quotidien des matieres a seance courte (EPS, arts, histoire). */
export const MINUTES_MAX_JOUR_SEANCE_COURTE = 60
/** Plafond quotidien des matieres generales (francais, maths, QLM, langue vivante). */
export const MINUTES_MAX_JOUR_GENERAL = 120

/** Plafond quotidien applicable a une matiere donnee, en minutes. */
export function plafondJournalier(matiere: string): number {
  return /physique|sportive|artistique|histoire/i.test(matiere)
    ? MINUTES_MAX_JOUR_SEANCE_COURTE
    : MINUTES_MAX_JOUR_GENERAL
}

/**
 * Remplit une plage [debut, fin] en tirant des minutes dans la file (mutee),
 * SANS depasser le plafond quotidien de chaque matiere.
 *
 * `placeCeJour` cumule ce qui a deja ete pose dans la journee (matins ET
 * apres-midi confondus, plus le bloc code fixe), donc la contrainte vaut pour la
 * journee entiere et pas seulement pour la demi-journee courante.
 *
 * Si plus aucune matiere ne peut etre posee sans violer une contrainte, on
 * s'arrete et on laisse un blanc : une case vide et editable vaut mieux qu'un
 * emploi du temps qui enfreint la regle demandee.
 */
function remplirPlage(
  debut: number,
  fin: number,
  file: Segment[],
  placeCeJour: Map<string, number> = new Map(),
): { debut: number; fin: number; matiere: string }[] {
  const out: { debut: number; fin: number; matiere: string }[] = []
  let curseur = debut

  while (curseur < fin) {
    // Premiere matiere de la file qui a encore du volume ET de la marge aujourd'hui.
    const idx = file.findIndex(s =>
      s.minutes > 0 && (placeCeJour.get(s.matiere) ?? 0) < plafondJournalier(s.matiere))
    if (idx === -1) break

    const seg = file[idx]
    const marge = plafondJournalier(seg.matiere) - (placeCeJour.get(seg.matiere) ?? 0)
    const prise = Math.min(fin - curseur, seg.minutes, marge)
    if (prise <= 0) break

    out.push({ debut: curseur, fin: curseur + prise, matiere: seg.matiere })
    curseur += prise
    seg.minutes -= prise
    placeCeJour.set(seg.matiere, (placeCeJour.get(seg.matiere) ?? 0) + prise)
    if (seg.minutes <= 0) file.splice(idx, 1)
  }
  return out
}

function creneau(jour: string, debut: number, fin: number, matiere: string,
  type: 'cours' | 'routine', ordre: number): CreneauTrame {
  return {
    jour,
    heure_debut: hhmm(debut),
    heure_fin: hhmm(fin),
    matiere,
    type,
    couleur: type === 'routine' ? '#f3f4f6' : couleurMatiere(matiere),
    ordre,
  }
}

type Bloc = { debut: number; fin: number; matiere: string; type: 'cours' | 'routine' }

/**
 * Genere l'emploi du temps CP complet (une ligne par jour x creneau), pret a
 * inserer dans `emploi_du_temps`. codeRenforce=true garantit un bloc code chaque
 * matin (defaut valide avec Christophe).
 *
 * Placement en DEUX passes pour respecter la priorite matin : on remplit d'abord
 * TOUS les matins de la semaine (bloc code garanti + maths + langue), puis TOUS
 * les apres-midis (reste de la langue debordante + QLM, EPS, arts, LV). Sinon
 * une matiere du matin (maths) fuirait dans l'apres-midi d'un jour avant d'avoir
 * rempli les matins des jours suivants.
 */
export function genererEdtCP(codeRenforce = true): CreneauTrame[] {
  const { codeMatinQuotidien, fileMatin, fileAprem } = repartirVolumes(codeRenforce)
  const plageA = CADRE.plages[0] // 1er creneau du matin (bloc code)
  const plagesMatin = CADRE.plages.filter(x => x.periode === 'matin')
  const plagesAprem = CADRE.plages.filter(x => x.periode === 'aprem')

  const matinParJour: Record<string, Bloc[]> = {}
  const apremParJour: Record<string, Bloc[]> = {}
  // Cumul par journee, partage entre la passe matin et la passe apres-midi :
  // le plafond quotidien vaut pour la journee entiere.
  const placeParJour: Record<string, Map<string, number>> =
    Object.fromEntries(JOURS_EDT.map(j => [j, new Map<string, number>()]))

  // ── Passe 1 : tous les matins ──────────────────────────────────────────────
  for (const jour of JOURS_EDT) {
    const blocs: Bloc[] = []
    const place = placeParJour[jour]
    for (const p of plagesMatin) {
      if (codeRenforce && p.debut === plageA.debut) {
        const finCode = Math.min(p.fin, p.debut + codeMatinQuotidien)
        const matiereCode = 'Etude du code (lecture, graphemes)'
        blocs.push({ debut: p.debut, fin: finCode, matiere: matiereCode, type: 'cours' })
        // Le bloc code fixe compte dans le quota du jour.
        place.set(matiereCode, (place.get(matiereCode) ?? 0) + (finCode - p.debut))
        if (finCode < p.fin) {
          for (const s of remplirPlage(finCode, p.fin, fileMatin, place))
            blocs.push({ ...s, type: 'cours' })
        }
      } else {
        for (const s of remplirPlage(p.debut, p.fin, fileMatin, place))
          blocs.push({ ...s, type: 'cours' })
      }
    }
    matinParJour[jour] = blocs
  }

  // Ce qui reste dans fileMatin (langue debordante) part en tete des apres-midi.
  const fileApremComplete = fileMatin.filter(s => s.minutes > 0).concat(fileAprem)

  // ── Passe 2 : tous les apres-midi ──────────────────────────────────────────
  for (const jour of JOURS_EDT) {
    const blocs: Bloc[] = []
    const place = placeParJour[jour]
    for (const p of plagesAprem) {
      for (const s of remplirPlage(p.debut, p.fin, fileApremComplete, place))
        blocs.push({ ...s, type: 'cours' })
    }
    apremParJour[jour] = blocs
  }

  // ── Assemblage chronologique par jour + numerotation ordre ─────────────────
  const out: CreneauTrame[] = []
  let ordre = 0
  const push = (jour: string, b: Bloc) =>
    out.push(creneau(jour, b.debut, b.fin, b.matiere, b.type, ordre++))

  // L'ordre de push n'importe pas : on trie par (jour, heure) juste apres.
  for (const jour of JOURS_EDT) {
    push(jour, { ...CADRE.rituelMatin, matiere: 'Rituels du jour (accueil, appel, date)', type: 'routine' })
    for (const b of matinParJour[jour]) push(jour, b)
    push(jour, { ...CADRE.recreMatin, matiere: 'Recreation', type: 'routine' })
    push(jour, { ...CADRE.dejeuner, matiere: 'Pause dejeuner / cantine', type: 'routine' })
    push(jour, { ...CADRE.tempsCalme, matiere: 'Temps calme (lecture)', type: 'cours' })
    for (const b of apremParJour[jour]) push(jour, b)
    push(jour, { ...CADRE.recreAprem, matiere: 'Recreation', type: 'routine' })
  }

  // Tri final par (jour, heure_debut) pour garantir un ordre chronologique.
  const rangJour = (j: string) => JOURS_EDT.indexOf(j as typeof JOURS_EDT[number])
  out.sort((a, b) =>
    rangJour(a.jour) - rangJour(b.jour) || a.heure_debut.localeCompare(b.heure_debut))
  out.forEach((c, i) => { c.ordre = i })
  return out
}
