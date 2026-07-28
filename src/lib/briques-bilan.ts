/**
 * Les briques d'une appréciation, et la phrase qu'elles composent.
 *
 * Demande de Christophe du 27/07/2026 : l'appréciation ne sort pas d'un bloc,
 * elle s'assemble à partir de briques décochables et modifiables. Chaque brique
 * vient de quelque chose de réel : un niveau posé, ou un mot écrit pendant la
 * période. L'enseignante enlève ce qu'elle ne veut pas dire, puis rédige.
 *
 * Trois règles non négociables, tenues ici :
 *   1. jamais un code de niveau ni le libellé technique d'une compétence dans
 *      le texte final. Un parent doit comprendre.
 *   2. une difficulté ne s'énonce jamais seule, toujours avec ce qu'on va faire.
 *   3. on n'invente jamais une observation. Sans phrase écrite par
 *      l'enseignante, la compétence ne produit rien.
 *
 * Fonctions pures, sans React ni Supabase.
 */

import type { ElementBilan } from '@/lib/bilan-periode'
import type { Niveau } from '@/lib/niveaux'

export type Formulation = {
  eclat: string
  reussite: string
  encours: string
  vigilance: string
  suite: string
}

export type MotDeLaSemaine = { semaine: number; matiere: string; texte: string }

export type Brique = {
  /** `c:<competenceId>` ou `s:<semaine>`. Sert à retrouver la brique. */
  cle: string
  role: string
  texte: string
  /** Ce qu'on va faire. N'accompagne que la vigilance. */
  suite: string
  /** D'où vient la brique, pour pouvoir remonter du texte à sa source. */
  source: string
  actif: boolean
}

export type EntreeBriques = {
  elements: ElementBilan[]
  /** Les phrases de l'enseignante, par identifiant de compétence. */
  formulations: Record<string, Formulation>
  motsDeLaSemaine: MotDeLaSemaine[]
  /** Les clés que l'enseignante a décochées. */
  ecartees: string[]
  /** Ce qu'elle a réécrit, par `clé|rôle`. */
  retouchees: Record<string, { texte: string; suite: string }>
}

const ROLE_DU_NIVEAU: Record<Niveau, string> = {
  depasse: 'réussite',
  atteint: 'réussite',
  partiellement: 'progrès',
  non_atteint: 'vigilance',
}

/** L'ordre de la phrase finale. Les mots de l'enseignante passent avant la fin. */
const ORDRE_ROLES = ['posture', 'réussite', 'progrès', 'vigilance', 'encouragement']

function rangDuRole(role: string): number {
  const i = ORDRE_ROLES.indexOf(role)
  return i === -1 ? ORDRE_ROLES.length - 1.5 : i
}

function phrasePour(formulation: Formulation, niveau: Niveau): string {
  if (niveau === 'depasse') return formulation.eclat.trim() || formulation.reussite.trim()
  if (niveau === 'atteint') return formulation.reussite.trim()
  if (niveau === 'partiellement') return formulation.encours.trim()
  return formulation.vigilance.trim()
}

export function construireBriques(entree: EntreeBriques): Brique[] {
  const { elements, formulations, motsDeLaSemaine, ecartees, retouchees } = entree
  const decochees = new Set(ecartees)
  const briques: Brique[] = []

  for (const element of elements) {
    if (element.niveau === null) continue
    const formulation = formulations[element.competenceId]
    if (!formulation) continue

    const texte = phrasePour(formulation, element.niveau)
    // Règle 3 : sans phrase écrite, on n'invente pas. Le libellé officiel est
    // écrit pour l'institution, il ne peut pas la remplacer.
    if (!texte) continue

    const role = ROLE_DU_NIVEAU[element.niveau]
    const cle = `c:${element.competenceId}`
    // Règle 2 : la difficulté emmène toujours sa prochaine étape.
    const suite = element.niveau === 'non_atteint' ? formulation.suite.trim() : ''
    // La retouche est gardée par clé ET par rôle : si le niveau rebascule, une
    // phrase de réussite corrigée ne doit pas se poser sur une difficulté.
    const retouche = retouchees[`${cle}|${role}`]

    briques.push({
      cle,
      role,
      texte: retouche ? retouche.texte : texte,
      suite: retouche ? retouche.suite : suite,
      source: element.libelle,
      actif: !decochees.has(cle),
    })
  }

  for (const mot of motsDeLaSemaine) {
    const texte = mot.texte.trim()
    if (!texte) continue
    const cle = `s:${mot.semaine}`
    const role = `ton mot de la semaine ${mot.semaine}`
    const retouche = retouchees[`${cle}|${role}`]

    briques.push({
      cle,
      role,
      texte: retouche ? retouche.texte : texte,
      suite: '',
      source: `semaine ${mot.semaine}`,
      actif: !decochees.has(cle),
    })
  }

  return briques.sort((a, b) => rangDuRole(a.role) - rangDuRole(b.role))
}

function majuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

/**
 * La phrase finale, en cinq temps : posture, réussites regroupées, progrès,
 * point de vigilance avec sa prochaine étape, encouragement.
 *
 * Le prénom ouvre le texte, le pronom prend le relais. Sans genre connu, le
 * prénom est répété : plus lourd, jamais faux. On ne devine pas le genre d'un
 * enfant à partir de son prénom.
 */
export function redigerAppreciation(
  briques: Brique[],
  eleve: { prenom: string; genre: 'f' | 'm' | null },
): string {
  const prises = briques.filter(b => b.actif && b.texte.trim())
  if (prises.length === 0) return ''

  const pronom = eleve.genre === 'm' ? 'Il' : eleve.genre === 'f' ? 'Elle' : eleve.prenom
  const parRole = (role: string) => prises.filter(b => b.role === role)
  const phrases: string[] = []
  let nomme = false

  const sujet = () => {
    const mot = nomme ? pronom : eleve.prenom
    nomme = true
    return mot
  }

  for (const brique of parRole('posture')) {
    phrases.push(`${sujet()} ${brique.texte}.`)
  }

  const reussites = parRole('réussite').map(b => b.texte)
  if (reussites.length === 1) {
    phrases.push(`${sujet()} ${reussites[0]}.`)
  } else if (reussites.length > 1) {
    const derniere = reussites[reussites.length - 1]
    phrases.push(`${sujet()} ${reussites.slice(0, -1).join(', ')} et ${derniere}.`)
  }

  for (const brique of parRole('progrès')) {
    phrases.push(`${sujet()} ${brique.texte}.`)
  }

  // La vigilance parle de la difficulté et pas de l'enfant : elle garde sa
  // tournure impersonnelle, et sa prochaine étape la suit toujours.
  for (const brique of parRole('vigilance')) {
    phrases.push(majuscule(brique.texte) + (brique.suite ? ` ; ${brique.suite}.` : '.'))
  }

  const connus = new Set(ORDRE_ROLES)
  for (const brique of prises.filter(b => !connus.has(b.role))) {
    phrases.push(`${sujet()} ${brique.texte}.`)
  }

  for (const brique of parRole('encouragement')) {
    phrases.push(brique.texte)
  }

  return phrases.join(' ')
}
