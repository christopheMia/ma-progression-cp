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

  // "Retenu" = ce qui est REELLEMENT pose dans la grille, mesure sur l'emploi du
  // temps genere, et non le volume theorique d'avant placement. Les contraintes
  // (plafonds journaliers, seances d'une heure) peuvent decaler quelques minutes
  // d'une matiere a l'autre : la fenetre doit montrer le resultat, pas l'intention.
  const grille = genererEdtCP(codeRenforce)
  const placees = (prefixe: string) => grille
    .filter(c => c.type !== 'routine' && c.matiere.startsWith(prefixe))
    .reduce((n, c) => {
      const [hd, md] = c.heure_debut.split(':').map(Number)
      const [hf, mf] = c.heure_fin.split(':').map(Number)
      return n + (hf * 60 + mf) - (hd * 60 + md)
    }, 0)

  const codeTotal = placees('Etude du code')
  const langue = placees('Etude de la langue')

  const volumes: LigneVolume[] = [
    { matiere: 'Français : étude du code (lecture, graphèmes)', officiel: null, retenu: codeTotal },
    { matiere: 'Français : étude de la langue', officiel: null, retenu: langue },
    { matiere: 'Français (total)', officiel: VOLUME_OFFICIEL_CP.francais, retenu: codeTotal + langue },
    { matiere: 'Mathématiques', officiel: VOLUME_OFFICIEL_CP.maths, retenu: placees('Mathematiques') },
    { matiere: 'Questionner le monde (dont EMC)', officiel: VOLUME_OFFICIEL_CP.qlm, retenu: placees('Questionner') },
    { matiere: 'Éducation physique et sportive', officiel: VOLUME_OFFICIEL_CP.eps, retenu: placees('Education physique') },
    { matiere: 'Enseignements artistiques', officiel: VOLUME_OFFICIEL_CP.arts, retenu: placees('Enseignements artistiques') },
    { matiere: 'Langue vivante (anglais)', officiel: VOLUME_OFFICIEL_CP.langueVivante, retenu: placees('Langue vivante') },
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
      `Une séance occupe un créneau entier (${formatDuree(CADRE.plages[0].fin - CADRE.plages[0].debut)}) : jamais de morceaux de 15 ou 30 minutes, chaque séance dépasse l'heure pleine.`,
      'Une matière n\'apparaît au plus qu\'une fois par jour : jamais 2 h de la même matière le même jour, et les matières reviennent souvent dans la semaine plutôt qu\'en un seul gros bloc.',
      'Le nombre de séances de chaque matière est proportionnel à son volume officiel. Le découpage en séances entières décale légèrement certains volumes : le tableau ci-dessus montre le résultat réel.',
      "L'après-midi reçoit le reste : questionner le monde, EPS, arts, langue vivante.",
      'Tous les matins de la semaine sont remplis avant les après-midi, pour qu\'une matière du matin ne déborde pas trop tôt.',
      'Le résultat est 100 % modifiable ensuite : horaires, matières, couleurs.',
    ],
  }
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

/** Nom de la matiere du bloc code garanti chaque matin. */
const MATIERE_CODE = 'Etude du code (lecture, graphemes)'

/**
 * Repartit un nombre entier de SEANCES par matiere, au prorata du volume, par la
 * methode des plus forts restes, sans qu'une matiere depasse `maxParMatiere`
 * (= une seance par jour au maximum).
 */
export function repartirSeances(
  demandes: { matiere: string; minutes: number }[],
  nbSeances: number,
  maxParMatiere: number,
): { matiere: string; seances: number }[] {
  const total = demandes.reduce((n, d) => n + d.minutes, 0)
  if (!demandes.length || total <= 0 || nbSeances <= 0) return []

  const exact = demandes.map(d => ({
    matiere: d.matiere,
    ideal: (d.minutes / total) * nbSeances,
  }))
  const alloc = exact.map(e => ({
    matiere: e.matiere,
    seances: Math.min(maxParMatiere, Math.floor(e.ideal)),
    reste: e.ideal - Math.floor(e.ideal),
  }))

  // Distribution des seances restantes aux plus forts restes, en respectant le
  // plafond d'une seance par jour.
  let restantes = nbSeances - alloc.reduce((n, a) => n + a.seances, 0)
  const parReste = [...alloc].sort((a, b) => b.reste - a.reste)
  let progresse = true
  while (restantes > 0 && progresse) {
    progresse = false
    for (const a of parReste) {
      if (restantes <= 0) break
      if (a.seances >= maxParMatiere) continue
      a.seances++
      restantes--
      progresse = true
    }
  }

  return alloc.map(a => ({ matiere: a.matiere, seances: a.seances }))
}

/**
 * Genere l'emploi du temps CP complet (une ligne par jour x creneau), pret a
 * inserer dans `emploi_du_temps`.
 *
 * Principe : UNE PLAGE = UNE SEANCE = UNE SEULE MATIERE.
 * Les plages du cadre durent 1 h 15, donc chaque seance depasse l'heure pleine
 * (demande du 20/07 : "il faut au moins des heures completes"). On ne decoupe
 * plus une plage en morceaux de 15 ou 30 minutes, ce qui produisait des emplois
 * du temps hachés et illisibles.
 *
 * Contraintes respectees par construction :
 *  - une matiere n'apparait au plus qu'UNE fois par jour (donc jamais 2 h de la
 *    meme matiere le meme jour, pour aucune matiere),
 *  - le bloc code est garanti en tout debut de chaque matinee,
 *  - le nombre de seances de chaque matiere est proportionnel a son volume
 *    horaire officiel (methode des plus forts restes),
 *  - priorite au matin pour les maths et l'etude de la langue.
 */
export function genererEdtCP(codeRenforce = true): CreneauTrame[] {
  const { fileMatin, fileAprem } = repartirVolumes(codeRenforce)
  const plagesMatin = CADRE.plages.filter(x => x.periode === 'matin')
  const plagesAprem = CADRE.plages.filter(x => x.periode === 'aprem')
  const nbJours = JOURS_EDT.length

  // Le 1er creneau du matin est reserve au bloc code garanti.
  const plagesMatinLibres = codeRenforce ? plagesMatin.slice(1) : plagesMatin
  const nbSeancesLibres = (plagesMatinLibres.length + plagesAprem.length) * nbJours

  const demandes = [...fileMatin, ...fileAprem].filter(s => s.minutes > 0)
  const allocation = repartirSeances(demandes, nbSeancesLibres, nbJours)

  // Reste a placer, par matiere.
  const restant = new Map<string, number>()
  for (const a of allocation) if (a.seances > 0) restant.set(a.matiere, a.seances)
  const prefereMatin = new Set(fileMatin.map(s => s.matiere))

  /**
   * Choisit la matiere a poser sur une seance donnee : jamais deux fois la meme
   * matiere dans la journee, priorite a celle qui a le plus de seances restantes
   * (pour etaler le volume sur toute la semaine), et priorite matin/apres-midi
   * quand c'est possible.
   */
  function choisir(
    dejaParJour: Record<string, Set<string>>,
    jour: string,
    joursRestants: string[],
    matin: boolean,
  ): string | null {
    const candidats = [...restant.entries()]
      .filter(([m, n]) => n > 0 && !dejaParJour[jour].has(m))
    if (!candidats.length) return null

    // URGENCE : une matiere ne pouvant plus aller que sur peu de jours doit
    // passer avant une matiere encore placable partout. Sans ce critere, les
    // matieres d'apres-midi monopolisaient les creneaux et il restait une seance
    // de maths sans jour disponible (elle etait alors perdue).
    const urgence = ([m, n]: [string, number]) => {
      const possibles = joursRestants.filter(j => !dejaParJour[j].has(m)).length
      return n / Math.max(1, possibles)
    }
    // La preference matin / apres-midi devient un simple departage, plus un
    // filtre : elle ne doit jamais faire perdre une seance.
    const bonMoment = ([m]: [string, number]) => (prefereMatin.has(m) === matin ? 1 : 0)

    candidats.sort((a, b) =>
      urgence(b) - urgence(a) ||
      bonMoment(b) - bonMoment(a) ||
      b[1] - a[1] ||
      a[0].localeCompare(b[0]))
    return candidats[0][0]
  }

  function poser(matiere: string) {
    const n = restant.get(matiere) ?? 0
    if (n <= 1) restant.delete(matiere)
    else restant.set(matiere, n - 1)
  }

  // ── Affectation en DEUX passes ──────────────────────────────────────────────
  // Jour par jour, on bloquait : quand les matieres d'apres-midi etaient epuisees
  // pour la journee, un creneau restait vide alors qu'il restait des maths a
  // placer. On affecte donc d'abord TOUS les matins de la semaine, puis TOUS les
  // apres-midi avec la connaissance complete de ce qui reste.
  const dejaAujourdhui: Record<string, Set<string>> =
    Object.fromEntries(JOURS_EDT.map(j => [j, new Set<string>()]))
  const matinAffecte: Record<string, string[]> = Object.fromEntries(JOURS_EDT.map(j => [j, []]))
  const apremAffecte: Record<string, string[]> = Object.fromEntries(JOURS_EDT.map(j => [j, []]))

  if (codeRenforce) for (const jour of JOURS_EDT) dejaAujourdhui[jour].add(MATIERE_CODE)

  JOURS_EDT.forEach((jour, idxJour) => {
    const joursRestants = JOURS_EDT.slice(idxJour)
    for (let i = 0; i < plagesMatinLibres.length; i++) {
      const m = choisir(dejaAujourdhui, jour, joursRestants, true)
      if (!m) continue
      matinAffecte[jour].push(m)
      dejaAujourdhui[jour].add(m)
      poser(m)
    }
  })
  JOURS_EDT.forEach((jour, idxJour) => {
    const joursRestants = JOURS_EDT.slice(idxJour)
    for (let i = 0; i < plagesAprem.length; i++) {
      const m = choisir(dejaAujourdhui, jour, joursRestants, false)
      if (!m) continue
      apremAffecte[jour].push(m)
      dejaAujourdhui[jour].add(m)
      poser(m)
    }
  })

  const out: CreneauTrame[] = []
  let ordre = 0
  const push = (jour: string, b: Bloc) =>
    out.push(creneau(jour, b.debut, b.fin, b.matiere, b.type, ordre++))

  for (const jour of JOURS_EDT) {
    push(jour, { ...CADRE.rituelMatin, matiere: 'Rituels du jour (accueil, appel, date)', type: 'routine' })

    if (codeRenforce) {
      const p = plagesMatin[0]
      push(jour, { debut: p.debut, fin: p.fin, matiere: MATIERE_CODE, type: 'cours' })
    }
    matinAffecte[jour].forEach((m, i) => {
      const p = plagesMatinLibres[i]
      push(jour, { debut: p.debut, fin: p.fin, matiere: m, type: 'cours' })
    })

    push(jour, { ...CADRE.recreMatin, matiere: 'Recreation', type: 'routine' })
    push(jour, { ...CADRE.dejeuner, matiere: 'Pause dejeuner / cantine', type: 'routine' })
    push(jour, { ...CADRE.tempsCalme, matiere: 'Temps calme (lecture)', type: 'cours' })

    apremAffecte[jour].forEach((m, i) => {
      const p = plagesAprem[i]
      push(jour, { debut: p.debut, fin: p.fin, matiere: m, type: 'cours' })
    })

    push(jour, { ...CADRE.recreAprem, matiere: 'Recreation', type: 'routine' })
  }

  // Tri final par (jour, heure_debut) pour garantir un ordre chronologique.
  const rangJour = (j: string) => JOURS_EDT.indexOf(j as typeof JOURS_EDT[number])
  out.sort((a, b) =>
    rangJour(a.jour) - rangJour(b.jour) || a.heure_debut.localeCompare(b.heure_debut))
  out.forEach((c, i) => { c.ordre = i })
  return out
}
