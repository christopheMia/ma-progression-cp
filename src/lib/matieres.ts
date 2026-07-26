import { familleMatiere, type Famille } from '@/data/trame-edt'

const CODE_PAR_FAMILLE: Record<Famille, string> = {
  francais: 'francais',
  maths: 'maths',
  qlm: 'qlm',
  eps: 'eps',
  arts: 'arts',
  langueVivante: 'anglais',
  emc: 'emc',
  routine: 'routine',
}

const LIBELLE_PAR_CODE: Record<string, string> = {
  francais: 'Français',
  maths: 'Mathématiques',
  qlm: 'Questionner le monde',
  eps: 'EPS',
  arts: 'Arts',
  anglais: 'Anglais',
  emc: 'EMC',
  routine: 'Routine',
}

function slugifierMatiere(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Code stable utilisé en base pour une matière.
 *
 * Les familles pédagogiques reconnues passent toutes par `familleMatiere`.
 * Une matière personnalisée conserve un slug déterministe.
 */
export function codeMatiereCanonique(libelle: string): string {
  const famille = familleMatiere(libelle)
  if (famille) return CODE_PAR_FAMILLE[famille]

  return slugifierMatiere(libelle) || 'matiere-inconnue'
}

/** Libellé destiné à l’interface, jamais à la persistance. */
export function libelleMatiereCanonique(codeOuLibelle: string): string {
  const code = codeMatiereCanonique(codeOuLibelle)
  const connu = LIBELLE_PAR_CODE[code]
  if (connu) return connu

  const mots = code.split('-').filter(Boolean)
  const libelle = mots.join(' ')
  return libelle
    ? `${libelle.charAt(0).toLocaleUpperCase('fr-FR')}${libelle.slice(1)}`
    : 'Matière inconnue'
}

export function trouverProgressionMatiere<T extends { matiere: string }>(
  progression: T[],
  codeOuLibelle: string,
): T | undefined {
  const code = codeMatiereCanonique(codeOuLibelle)
  return progression.find(ligne => codeMatiereCanonique(ligne.matiere) === code)
}
