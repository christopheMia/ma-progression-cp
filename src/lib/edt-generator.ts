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

/** Remplit une plage [debut, fin] en tirant des minutes dans la file (mutee). */
function remplirPlage(
  debut: number,
  fin: number,
  file: Segment[],
): { debut: number; fin: number; matiere: string }[] {
  const out: { debut: number; fin: number; matiere: string }[] = []
  let curseur = debut
  while (curseur < fin && file.length > 0) {
    const seg = file[0]
    if (seg.minutes <= 0) { file.shift(); continue }
    const dispo = fin - curseur
    const prise = Math.min(dispo, seg.minutes)
    out.push({ debut: curseur, fin: curseur + prise, matiere: seg.matiere })
    curseur += prise
    seg.minutes -= prise
    if (seg.minutes <= 0) file.shift()
  }
  // Si la file est vide mais qu'il reste du temps, on laisse un blanc editable.
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

  // ── Passe 1 : tous les matins ──────────────────────────────────────────────
  for (const jour of JOURS_EDT) {
    const blocs: Bloc[] = []
    for (const p of plagesMatin) {
      if (codeRenforce && p.debut === plageA.debut) {
        const finCode = Math.min(p.fin, p.debut + codeMatinQuotidien)
        blocs.push({ debut: p.debut, fin: finCode, matiere: 'Etude du code (lecture, graphemes)', type: 'cours' })
        if (finCode < p.fin) {
          for (const s of remplirPlage(finCode, p.fin, fileMatin))
            blocs.push({ ...s, type: 'cours' })
        }
      } else {
        for (const s of remplirPlage(p.debut, p.fin, fileMatin))
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
    for (const p of plagesAprem) {
      for (const s of remplirPlage(p.debut, p.fin, fileApremComplete))
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
