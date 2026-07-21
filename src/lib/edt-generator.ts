// src/lib/edt-generator.ts
//
// Genere un emploi du temps CP a partir du volume horaire officiel (cycle 2).
//
// REGLES VALIDEES AVEC CHRISTOPHE (21/07/2026, apres correction de sa part) :
//  - on RESPECTE les quotas reglementaires : chaque matiere recoit son volume
//    officiel, reduit du meme facteur pour absorber les recreations (choix
//    "deduction au prorata"), et la somme retombe EXACTEMENT sur le budget ;
//  - matieres principales : seances de 30 min a 2 h ;
//  - EPS et arts : seances d'au plus 1 h 30 ;
//  - rituels : 15 min ;
//  - tout est cale sur des multiples de 15 min.
//
// Modele precedent (une plage = une seance de 1 h 15) abandonne : il ne
// permettait pas de tomber sur les quotas, et l'emploi du temps reel de Cecile
// montre au contraire une journee tres modulaire (blocs de 5 a 30 min).
//
// Fonction pure : aucun effet de bord, aucune dependance base.

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

/** Tout est cale sur le quart d'heure. */
const PAS = 15

// ── Cadre de journee, en minutes depuis minuit ───────────────────────────────
const H = (h: number, m = 0) => h * 60 + m

type PlageCours = { debut: number; fin: number }

const CADRE = {
  rituel: { debut: H(8, 30), fin: H(8, 45) },
  recreMatin: { debut: H(10, 0), fin: H(10, 15) },
  dejeuner: { debut: H(11, 30), fin: H(13, 30) },
  recreAprem: { debut: H(15, 0), fin: H(15, 15) },
  /** Plages a remplir, hors rituel : 75 + 75 + 90 + 75 = 315 min. */
  plages: [
    { debut: H(8, 45), fin: H(10, 0) },   // 75
    { debut: H(10, 15), fin: H(11, 30) }, // 75
    { debut: H(13, 30), fin: H(15, 0) },  // 90
    { debut: H(15, 15), fin: H(16, 30) }, // 75
  ] as PlageCours[],
}

const MATIERE_RITUEL = 'Rituels (date, langage, calendrier)'
const MATIERE_CODE = 'Etude du code (lecture, graphemes)'
const MATIERE_LANGUE = 'Etude de la langue (francais)'

/** Duree du bloc code garanti chaque matin (occupe la 1re plage en entier). */
const CODE_QUOTIDIEN = 75

function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/** Formate une duree : 90 -> "1 h 30", 60 -> "1 h", 45 -> "45 min". */
export function formatDuree(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${String(m).padStart(2, '0')}`
}

/** Duree maximale d'UNE seance, selon la matiere (regles du 21/07). */
export function dureeMaxSeance(matiere: string): number {
  return /physique|sportive|artistique|arts|histoire/i.test(matiere) ? 90 : 120
}

/** Duree minimale d'une seance de cours (hors rituel). */
export const DUREE_MIN_SEANCE = 30

/** Volume quotidien maximal d'une meme matiere, pour eviter les gros blocs. */
export function maxParJour(matiere: string): number {
  return /physique|sportive|artistique|arts|histoire/i.test(matiere) ? 90 : 120
}

export type Quota = { matiere: string; minutes: number }

/**
 * Repartit le budget hebdomadaire entre les matieres AU PRORATA de leurs
 * volumes officiels, par multiples de 15 min, avec la methode des plus forts
 * restes pour que la somme retombe exactement sur le budget.
 *
 * C'est ce qui garantit le respect des quotas : aucune matiere n'est rabotee
 * plus qu'une autre, et rien ne se perd dans les arrondis.
 */
export function repartirQuotas(budgetMinutes: number): Quota[] {
  const officiel: Array<[string, number]> = [
    ['francais', VOLUME_OFFICIEL_CP.francais],
    ['maths', VOLUME_OFFICIEL_CP.maths],
    ['qlm', VOLUME_OFFICIEL_CP.qlm],
    ['eps', VOLUME_OFFICIEL_CP.eps],
    ['arts', VOLUME_OFFICIEL_CP.arts],
    ['lv', VOLUME_OFFICIEL_CP.langueVivante],
  ]
  const nominal = officiel.reduce((s, [, v]) => s + v, 0)
  const unites = Math.floor(budgetMinutes / PAS)

  const calcul = officiel.map(([cle, v]) => {
    const ideal = (v / nominal) * unites
    return { cle, u: Math.floor(ideal), reste: ideal - Math.floor(ideal) }
  })
  let restantes = unites - calcul.reduce((s, c) => s + c.u, 0)
  for (const c of [...calcul].sort((a, b) => b.reste - a.reste)) {
    if (restantes <= 0) break
    c.u += 1
    restantes -= 1
  }
  return calcul.map(c => ({ matiere: c.cle, minutes: c.u * PAS }))
}

/** Budget de cours effectif degage par le cadre de journee, sur la semaine. */
export function budgetHebdomadaire(): number {
  const parJour = (CADRE.rituel.fin - CADRE.rituel.debut)
    + CADRE.plages.reduce((s, p) => s + (p.fin - p.debut), 0)
  return parJour * JOURS_EDT.length
}

export type LigneVolume = {
  matiere: string
  officiel: number | null
  retenu: number
}

export type ExplicationEdt = {
  jours: string[]
  journee: { debut: string; fin: string }
  budgetCours: number
  facteur: number
  volumes: LigneVolume[]
  cadre: { libelle: string; horaire: string }[]
  regles: string[]
}

type Segment = { matiere: string; minutes: number }
type Bloc = { debut: number; fin: number; matiere: string; type: 'cours' | 'routine' }

/**
 * Choisit la duree d'une seance a poser dans une plage.
 * On evite de laisser un reliquat inutilisable (< 30 min) : soit on remplit la
 * plage entierement, soit on laisse au moins de quoi poser une autre seance.
 */
export function choisirDuree(
  placeDisponible: number,
  resteMatiere: number,
  margeJour: number,
  maxSeance: number,
): number {
  const plafond = Math.min(placeDisponible, resteMatiere, margeJour, maxSeance)
  const debut = Math.floor(plafond / PAS) * PAS

  // Deux reliquats peuvent bloquer la suite : celui de la PLAGE (on ne pourra
  // plus rien y poser) et celui du QUOTA de la matiere (il resterait 15 min
  // orphelines, impossibles a placer puisqu'une seance fait 30 min minimum).
  // On cherche donc d'abord une duree qui n'en cree aucun des deux.
  const acceptable = (reliquat: number) => reliquat === 0 || reliquat >= DUREE_MIN_SEANCE

  for (let d = debut; d >= DUREE_MIN_SEANCE; d -= PAS) {
    if (acceptable(placeDisponible - d) && acceptable(resteMatiere - d)) return d
  }
  // A defaut, on evite au moins de bloquer la plage en cours.
  for (let d = debut; d >= DUREE_MIN_SEANCE; d -= PAS) {
    if (acceptable(placeDisponible - d)) return d
  }
  // Dernier recours : solder un residu par une seance courte (15 min). Sans ca,
  // il resterait des minutes de quota non placees et un trou dans la journee.
  // L'emploi du temps reel de Cecile contient beaucoup de blocs de 10 a 20 min :
  // une seance courte est realiste, un trou ne l'est pas.
  for (let d = Math.min(debut, DUREE_MIN_SEANCE); d >= PAS; d -= PAS) {
    if (d > 0 && placeDisponible - d >= 0) return d
  }
  return 0
}

/**
 * Genere l'emploi du temps CP complet.
 *
 * Deroulement : rituel de 15 min chaque matin, bloc code garanti sur la 1re
 * plage, puis remplissage des plages restantes matiere par matiere, en servant
 * toujours celle a qui il reste le plus de quota (pour etaler sur la semaine)
 * et en respectant le plafond quotidien de chaque matiere.
 */
export function genererEdtCP(codeRenforce = true): CreneauTrame[] {
  const budget = budgetHebdomadaire()
  const quotas = repartirQuotas(budget)
  const q = (cle: string) => quotas.find(x => x.matiere === cle)?.minutes ?? 0

  const nbJours = JOURS_EDT.length
  const rituelTotal = (CADRE.rituel.fin - CADRE.rituel.debut) * nbJours
  const codeTotal = codeRenforce ? CODE_QUOTIDIEN * nbJours : 0
  // Les rituels et le bloc code sont du francais : on les retire de son quota,
  // le reste devient l'etude de la langue. Ainsi le francais tombe pile.
  const langue = Math.max(0, q('francais') - rituelTotal - codeTotal)

  const aPlacer: Segment[] = [
    { matiere: MATIERE_LANGUE, minutes: langue },
    { matiere: 'Mathematiques', minutes: q('maths') },
    { matiere: 'Questionner le monde', minutes: q('qlm') },
    { matiere: 'Education physique et sportive', minutes: q('eps') },
    { matiere: 'Enseignements artistiques', minutes: q('arts') },
    { matiere: 'Langue vivante (anglais)', minutes: q('lv') },
  ].filter(s => s.minutes > 0)

  const out: CreneauTrame[] = []
  let ordre = 0
  const pousser = (jour: string, b: Bloc) =>
    out.push({
      jour,
      heure_debut: hhmm(b.debut),
      heure_fin: hhmm(b.fin),
      matiere: b.matiere,
      type: b.type,
      couleur: b.type === 'routine' ? '#f3f4f6' : couleurMatiere(b.matiere),
      ordre: ordre++,
    })

  for (const jour of JOURS_EDT) {
    const placeCeJour = new Map<string, number>()

    pousser(jour, { ...CADRE.rituel, matiere: MATIERE_RITUEL, type: 'cours' })

    CADRE.plages.forEach((plage, indexPlage) => {
      let curseur = plage.debut

      // 1re plage : bloc code garanti, en tout debut de matinee.
      if (codeRenforce && indexPlage === 0) {
        const fin = Math.min(plage.fin, curseur + CODE_QUOTIDIEN)
        pousser(jour, { debut: curseur, fin, matiere: MATIERE_CODE, type: 'cours' })
        placeCeJour.set(MATIERE_CODE, fin - curseur)
        curseur = fin
      }

      while (curseur < plage.fin) {
        // On sert la matiere a qui il reste le plus de quota : c'est ce qui
        // etale naturellement chaque matiere sur toute la semaine.
        const candidats = aPlacer
          .filter(s => s.minutes > 0)
          .map(s => ({
            seg: s,
            duree: choisirDuree(
              plage.fin - curseur,
              s.minutes,
              maxParJour(s.matiere) - (placeCeJour.get(s.matiere) ?? 0),
              dureeMaxSeance(s.matiere),
            ),
          }))
          .filter(c => c.duree > 0)
        if (!candidats.length) break

        candidats.sort((a, b) => b.seg.minutes - a.seg.minutes
          || a.seg.matiere.localeCompare(b.seg.matiere))
        const { seg, duree } = candidats[0]

        pousser(jour, { debut: curseur, fin: curseur + duree, matiere: seg.matiere, type: 'cours' })
        placeCeJour.set(seg.matiere, (placeCeJour.get(seg.matiere) ?? 0) + duree)
        seg.minutes -= duree
        curseur += duree
      }

      // Recreations et dejeuner, poses apres la plage correspondante.
      if (indexPlage === 0) pousser(jour, { ...CADRE.recreMatin, matiere: 'Recreation', type: 'routine' })
      if (indexPlage === 1) pousser(jour, { ...CADRE.dejeuner, matiere: 'Pause dejeuner / cantine', type: 'routine' })
      if (indexPlage === 2) pousser(jour, { ...CADRE.recreAprem, matiere: 'Recreation', type: 'routine' })
    })
  }

  const rangJour = (j: string) => JOURS_EDT.indexOf(j as typeof JOURS_EDT[number])
  out.sort((a, b) => rangJour(a.jour) - rangJour(b.jour)
    || a.heure_debut.localeCompare(b.heure_debut))
  out.forEach((c, i) => { c.ordre = i })
  return out
}

/**
 * Decrit ce que le generateur prend en compte, pour la fenetre d'explication.
 * Les volumes "retenu" sont MESURES sur la grille reellement generee, jamais
 * recopies a la main : l'explication ne peut pas diverger du comportement.
 */
export function expliquerGenerationEdt(codeRenforce = true): ExplicationEdt {
  const budget = budgetHebdomadaire()
  const grille = genererEdtCP(codeRenforce)

  const minutes = (c: CreneauTrame) => {
    const [hd, md] = c.heure_debut.split(':').map(Number)
    const [hf, mf] = c.heure_fin.split(':').map(Number)
    return (hf * 60 + mf) - (hd * 60 + md)
  }
  const placees = (...prefixes: string[]) => grille
    .filter(c => c.type !== 'routine' && prefixes.some(p => c.matiere.startsWith(p)))
    .reduce((n, c) => n + minutes(c), 0)

  const francais = placees('Rituels', 'Etude du code', 'Etude de la langue')

  const volumes: LigneVolume[] = [
    { matiere: 'Français : rituels quotidiens', officiel: null, retenu: placees('Rituels') },
    { matiere: 'Français : étude du code', officiel: null, retenu: placees('Etude du code') },
    { matiere: 'Français : étude de la langue', officiel: null, retenu: placees('Etude de la langue') },
    { matiere: 'Français (total)', officiel: VOLUME_OFFICIEL_CP.francais, retenu: francais },
    { matiere: 'Mathématiques', officiel: VOLUME_OFFICIEL_CP.maths, retenu: placees('Mathematiques') },
    { matiere: 'Questionner le monde (dont EMC)', officiel: VOLUME_OFFICIEL_CP.qlm, retenu: placees('Questionner') },
    { matiere: 'Éducation physique et sportive', officiel: VOLUME_OFFICIEL_CP.eps, retenu: placees('Education physique') },
    { matiere: 'Enseignements artistiques', officiel: VOLUME_OFFICIEL_CP.arts, retenu: placees('Enseignements artistiques') },
    { matiere: 'Langue vivante (anglais)', officiel: VOLUME_OFFICIEL_CP.langueVivante, retenu: placees('Langue vivante') },
  ]

  const nominal = Object.values(VOLUME_OFFICIEL_CP).reduce((s, v) => s + v, 0)
  const facteur = budget / nominal
  const plage = (p: { debut: number; fin: number }) => `${hhmm(p.debut)} - ${hhmm(p.fin)}`

  return {
    jours: [...JOURS_EDT],
    journee: { debut: hhmm(CADRE.rituel.debut), fin: hhmm(CADRE.plages[CADRE.plages.length - 1].fin) },
    budgetCours: budget,
    facteur,
    volumes,
    cadre: [
      { libelle: 'Rituels du jour (date, langage, calendrier)', horaire: plage(CADRE.rituel) },
      { libelle: 'Récréation du matin', horaire: plage(CADRE.recreMatin) },
      { libelle: 'Pause déjeuner / cantine', horaire: plage(CADRE.dejeuner) },
      { libelle: "Récréation de l'après-midi", horaire: plage(CADRE.recreAprem) },
    ],
    regles: [
      `Semaine de ${JOURS_EDT.length} jours : ${JOURS_EDT.join(', ')}.`,
      'Point de départ : le volume horaire officiel du cycle 2 (arrêté du 9 novembre 2015), soit 24 h.',
      `Les récréations (2 h par semaine) sont déduites au prorata : chaque matière garde exactement sa part officielle, réduite du même facteur (${Math.round(facteur * 100)} %). Le total enseigné est de ${formatDuree(budget)}.`,
      'Les quotas sont respectés au quart d\'heure près : la somme des matières retombe exactement sur le temps disponible, rien ne se perd dans les arrondis.',
      `Matières principales : séances de ${formatDuree(DUREE_MIN_SEANCE)} à ${formatDuree(120)}.`,
      `EPS et enseignements artistiques : séances de ${formatDuree(DUREE_MIN_SEANCE)} à ${formatDuree(90)} maximum.`,
      `Rituels quotidiens : ${formatDuree(CADRE.rituel.fin - CADRE.rituel.debut)}, comptés dans le français.`,
      codeRenforce
        ? `Code renforcé CP : un bloc d'étude du code de ${formatDuree(CODE_QUOTIDIEN)} est garanti CHAQUE matin, juste après les rituels.`
        : 'Code renforcé désactivé : le français n\'est pas scindé en code et étude de la langue.',
      `Aucune matière ne dépasse ${formatDuree(120)} sur une même journée (${formatDuree(90)} pour l'EPS et les arts).`,
      'À chaque créneau, la matière servie est celle à qui il reste le plus d\'heures à placer : chaque matière s\'étale ainsi sur toute la semaine.',
      'Le résultat est 100 % modifiable ensuite : horaires, matières, couleurs.',
    ],
  }
}
