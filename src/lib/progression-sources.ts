import type { ProgressionSemaine } from '@/data/manuels'
import { repartirProgrammation, type PeriodeProgrammation } from '@/lib/repartition-periode'

export type TypeDocumentProgression = 'periode' | 'programmation' | 'manuel'
export type NumeroPeriode = 1 | 2 | 3 | 4 | 5

interface SourceProgressionBase {
  clientId: string
  /** Contrat d integration : mapper `methode_sources.created_at` vers ce champ ISO. */
  creeLe: string
  nomSource: string
  matiere: string
  nomMethode: string
  semaines: unknown[]
  periodes: unknown[]
  empreinteContenu: string
}

export interface SourceProgressionPeriode extends SourceProgressionBase {
  typeDocument: 'periode'
  periodeNumero: NumeroPeriode
}

export interface SourceProgressionManuel extends SourceProgressionBase {
  typeDocument: 'manuel'
  periodeNumero: null
}

export interface SourceProgressionProgrammation extends SourceProgressionBase {
  typeDocument: 'programmation'
  periodeNumero: null
}

export type SourceProgression = SourceProgressionPeriode
  | SourceProgressionManuel
  | SourceProgressionProgrammation

export interface MethodeProgressionBrouillon {
  cle: string
  matiere: string
  nomMethode: string
  suiviActif: boolean
  sources: SourceProgression[]
}

export interface AnalyseAjoutSource {
  doublon: boolean
  autorisable: boolean
  periodesRemplacees: number[]
  message: string
}

export interface ResultatMaterialisation {
  semaines: ProgressionSemaine[]
  remplacements: Array<{
    numero: number
    ancienneSource: string
    nouvelleSource: string
  }>
  avertissements: string[]
}

export function normaliserTexte(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[Œœ]/g, lettre => (lettre === 'Œ' ? 'OE' : 'oe'))
    .replace(/[Ææ]/g, lettre => (lettre === 'Æ' ? 'AE' : 'ae'))
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .toLocaleLowerCase('fr-FR')
    .replace(/\s+/g, ' ')
    .trim()
}

export function cleMethode(source: Pick<SourceProgression, 'matiere' | 'nomMethode'>): string {
  return JSON.stringify([normaliserTexte(source.matiere), normaliserTexte(source.nomMethode)])
}

export function niveauPrecision(type: TypeDocumentProgression): number {
  if (type === 'periode') return 3
  if (type === 'programmation') return 2
  return 1
}

export function regrouperSources(sources: SourceProgression[]): MethodeProgressionBrouillon[] {
  const groupes = new Map<string, MethodeProgressionBrouillon>()

  for (const source of sources) {
    const cle = cleMethode(source)
    const existant = groupes.get(cle)

    if (existant) {
      existant.sources.push(source)
      continue
    }

    groupes.set(cle, {
      cle,
      matiere: source.matiere,
      nomMethode: source.nomMethode,
      suiviActif: true,
      sources: [source],
    })
  }

  return [...groupes.values()]
}

export function analyserAjoutSource(
  existantes: SourceProgression[],
  candidate: SourceProgression,
): AnalyseAjoutSource {
  if (existantes.some(source => source.empreinteContenu === candidate.empreinteContenu)) {
    return {
      doublon: true,
      autorisable: false,
      periodesRemplacees: [],
      message: 'Ce document est déjà importé.',
    }
  }

  if (candidate.typeDocument === 'periode' && candidate.periodeNumero !== null) {
    return {
      doublon: false,
      autorisable: true,
      periodesRemplacees: [candidate.periodeNumero],
      message: `La source détaillée remplacera la période ${candidate.periodeNumero}.`,
    }
  }

  return {
    doublon: false,
    autorisable: true,
    periodesRemplacees: [],
    message: 'Ce document complète la progression existante.',
  }
}

/**
 * Produit la progression effective d'une methode a partir de toutes ses sources.
 * Les documents restent immuables : seul le resultat materialise est reconstruit.
 */
export function materialiserSources(
  sources: SourceProgression[],
  semainesParPeriode: Map<number, number[]>,
): ResultatMaterialisation {
  const avertissements: string[] = []
  const remplacements: ResultatMaterialisation['remplacements'] = []
  const retenues = new Map<number, LigneMaterialisee>()

  for (const source of [...sources].sort(comparerSources)) {
    const lignes = lignesDeSource(source, semainesParPeriode, avertissements)

    for (const semaine of lignes) {
      if (!estNumeroSemaine(semaine.numero)) {
        avertissements.push(`La semaine ${semaine.numero} de « ${source.nomSource} » est hors de la plage 1 à 36.`)
        continue
      }
      if (!aDuContenu(semaine)) continue

      const candidate: LigneMaterialisee = {
        semaine,
        sourceId: source.clientId,
        precision: niveauPrecision(source.typeDocument),
      }
      const precedente = retenues.get(semaine.numero)

      if (!precedente) {
        retenues.set(semaine.numero, candidate)
        continue
      }

      if (candidate.precision < precedente.precision) continue

      retenues.set(semaine.numero, candidate)
      if (precedente.sourceId !== candidate.sourceId) {
        remplacements.push({
          numero: semaine.numero,
          ancienneSource: precedente.sourceId,
          nouvelleSource: candidate.sourceId,
        })
      }
    }
  }

  return {
    semaines: [...retenues.values()]
      .sort((a, b) => a.semaine.numero - b.semaine.numero)
      .map(({ semaine }) => copierSemaine(semaine)),
    remplacements,
    avertissements,
  }
}

export function estSourceProgressionValide(valeur: unknown): valeur is SourceProgression {
  if (!estObjet(valeur)) return false

  if (
    typeof valeur.clientId !== 'string'
    || !estDateIso(valeur.creeLe)
    || typeof valeur.nomSource !== 'string'
    || typeof valeur.matiere !== 'string'
    || typeof valeur.nomMethode !== 'string'
    || typeof valeur.empreinteContenu !== 'string'
    || !Array.isArray(valeur.semaines)
    || !Array.isArray(valeur.periodes)
  ) return false

  if (valeur.typeDocument === 'periode') {
    return estNumeroPeriode(valeur.periodeNumero)
  }

  return (valeur.typeDocument === 'manuel' || valeur.typeDocument === 'programmation')
    && valeur.periodeNumero === null
}

export async function calculerEmpreinteSource(
  source: Omit<SourceProgression, 'clientId' | 'empreinteContenu'> | SourceProgression,
): Promise<string> {
  // L unicite en base est deja portee par methode_id. L empreinte ne contient
  // donc que la forme du document et son contenu pedagogique effectif.
  const contenuEffectif = source.typeDocument === 'programmation'
    ? { periodes: periodesPourEmpreinte(source.periodes) }
    : { semaines: semainesPourEmpreinte(source.semaines) }
  const contenu = JSON.stringify(canonicaliser({
    typeDocument: source.typeDocument,
    periodeNumero: source.periodeNumero,
    ...contenuEffectif,
  }))
  const octets = new TextEncoder().encode(contenu)
  const digest = await crypto.subtle.digest('SHA-256', octets)

  return Array.from(new Uint8Array(digest), octet => octet.toString(16).padStart(2, '0')).join('')
}

function textePourEmpreinte(valeur: unknown): string {
  return typeof valeur === 'string'
    ? valeur.normalize('NFC').trim().replace(/\s+/g, ' ')
    : ''
}

function listeTextesPourEmpreinte(valeur: unknown): string[] {
  return Array.isArray(valeur)
    ? valeur.map(textePourEmpreinte).filter(Boolean)
    : []
}

function semainesPourEmpreinte(semaines: unknown[]): unknown[] {
  return semaines.flatMap(semaine => {
    if (!estObjet(semaine)) return []
    const items = listeTextesPourEmpreinte(semaine.items)
    const pages = textePourEmpreinte(semaine.pages)
    const mots_exemple = listeTextesPourEmpreinte(semaine.mots_exemple)
    if (!items.length && !pages && !mots_exemple.length) return []

    return [{
      numero: typeof semaine.numero === 'number' ? semaine.numero : null,
      items,
      pages,
      mots_exemple,
    }]
  })
}

function periodesPourEmpreinte(periodes: unknown[]): unknown[] {
  return periodes.flatMap(periode => {
    if (!estObjet(periode)) return []
    const domaines = Array.isArray(periode.domaines)
      ? periode.domaines.flatMap(domaine => {
          if (!estObjet(domaine)) return []
          const items = listeTextesPourEmpreinte(domaine.items)
          if (!items.length) return []
          return [{
            nom: textePourEmpreinte(domaine.nom),
            items,
          }]
        })
      : []
    if (!domaines.length) return []

    return [{
      numero: typeof periode.numero === 'number' ? periode.numero : null,
      domaines,
    }]
  })
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
}

function comparerSources(a: SourceProgression, b: SourceProgression): number {
  const precision = niveauPrecision(a.typeDocument) - niveauPrecision(b.typeDocument)
  if (precision) return precision

  const recence = Date.parse(a.creeLe) - Date.parse(b.creeLe)
  if (recence) return recence

  return comparerChaineBinaire(a.clientId, b.clientId)
}

function comparerChaineBinaire(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

type LigneMaterialisee = {
  semaine: ProgressionSemaine
  sourceId: string
  precision: number
}

function lignesDeSource(
  source: SourceProgression,
  semainesParPeriode: Map<number, number[]>,
  avertissements: string[],
): ProgressionSemaine[] {
  if (source.typeDocument === 'manuel') {
    return extraireSemaines(source.semaines, source.nomSource, avertissements)
  }

  if (source.typeDocument === 'programmation') {
    const periodes = extraireProgrammation(source.periodes, source.nomSource, avertissements)
    const repartition = repartirProgrammation(periodes, semainesParPeriode)
    for (const numero of repartition.periodesIgnorees) {
      avertissements.push(`La période ${numero} de « ${source.nomSource} » n'a aucune semaine calée.`)
    }
    return repartition.semaines.map(semaine => ({
      numero: semaine.numero,
      items: [...semaine.items],
      pages: '',
      mots_exemple: [],
    }))
  }

  const numeros = numerosPeriode(source.periodeNumero, semainesParPeriode, source.nomSource, avertissements)
  if (!numeros.length) return []

  const locales = source.semaines.flatMap((brute, index) => {
    const semaine = lireSemaine(brute)
    if (!semaine) {
      avertissements.push(`Une semaine de la période ${source.periodeNumero} de « ${source.nomSource} » est invalide et a été ignorée.`)
      return []
    }
    if (!estNumeroSemaine(semaine.numero)) {
      avertissements.push(`La semaine locale ${semaine.numero} de la période ${source.periodeNumero} est hors de la plage 1 à 36.`)
      return []
    }
    return [{ index, semaine }]
  })
  const localesEnTrop = locales.filter(({ index }) => index >= numeros.length).length
  if (localesEnTrop) {
    avertissements.push(
      `La période ${source.periodeNumero} de « ${source.nomSource} » contient ${localesEnTrop} semaine(s) en trop, ignorée(s) pour ne pas écrire dans la période suivante.`,
    )
  }

  return locales.flatMap(({ index, semaine }) => {
    const numero = numeros[index]
    if (numero === undefined) return []
    return [{
      ...copierSemaine(semaine),
      numero,
    }]
  })
}

function extraireSemaines(
  semaines: unknown[],
  nomSource: string,
  avertissements: string[],
): ProgressionSemaine[] {
  const propres: ProgressionSemaine[] = []

  for (const brute of semaines) {
    const semaine = lireSemaine(brute)
    if (!semaine) {
      avertissements.push(`Une semaine de « ${nomSource} » est invalide et a été ignorée.`)
      continue
    }
    propres.push(semaine)
  }
  return propres
}

function numerosPeriode(
  periodeNumero: NumeroPeriode,
  semainesParPeriode: Map<number, number[]>,
  nomSource: string,
  avertissements: string[],
): number[] {
  const numeros = semainesParPeriode.get(periodeNumero)
  if (!numeros?.length) {
    avertissements.push(`La période ${periodeNumero} de « ${nomSource} » n'a aucune semaine calée.`)
    return []
  }

  const uniques = new Set<number>()
  for (const numero of numeros) {
    if (estNumeroSemaine(numero)) uniques.add(numero)
    else avertissements.push(`La semaine ${numero} de la période ${periodeNumero} est hors de la plage 1 à 36.`)
  }
  if (!uniques.size) {
    avertissements.push(`La période ${periodeNumero} de « ${nomSource} » n'a aucune semaine valide.`)
  }
  return [...uniques].sort((a, b) => a - b)
}

function extraireProgrammation(
  periodes: unknown[],
  nomSource: string,
  avertissements: string[],
): PeriodeProgrammation[] {
  const propres = new Map<number, PeriodeProgrammation>()

  for (const brute of periodes) {
    if (!estObjet(brute)) {
      avertissements.push(`Une période de « ${nomSource} » est invalide et a été ignorée.`)
      continue
    }
    const numero = brute.numero
    if (typeof numero !== 'number' || !Number.isInteger(numero) || numero < 1 || numero > 5) {
      avertissements.push(`Une période de « ${nomSource} » est invalide et a été ignorée.`)
      continue
    }
    const domainesBruts = Array.isArray(brute.domaines) ? brute.domaines : []
    const domaines = domainesBruts.flatMap(domaine => {
      if (!estObjet(domaine)) return []
      const items = Array.isArray(domaine.items)
        ? domaine.items.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean)
        : []
      return items.length ? [{ nom: typeof domaine.nom === 'string' ? domaine.nom : '', items }] : []
    })
    const existante = propres.get(numero)
    if (existante) {
      existante.domaines.push(...domaines)
      avertissements.push(`Les blocs P${numero} de « ${nomSource} » ont été regroupés.`)
      continue
    }
    propres.set(numero, { numero, domaines })
  }
  return [...propres.values()]
}

function lireSemaine(brute: unknown): ProgressionSemaine | null {
  if (!estObjet(brute)) return null
  const numero = brute.numero
  if (typeof numero !== 'number' || !Number.isInteger(numero)) return null
  const items = Array.isArray(brute.items)
    ? brute.items.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean)
    : []
  const mots_exemple = Array.isArray(brute.mots_exemple)
    ? brute.mots_exemple.filter((mot): mot is string => typeof mot === 'string').map(mot => mot.trim()).filter(Boolean)
    : []
  return {
    numero,
    items,
    pages: typeof brute.pages === 'string' ? brute.pages.trim() : '',
    mots_exemple,
  }
}

function aDuContenu(semaine: ProgressionSemaine): boolean {
  return semaine.items.length > 0 || semaine.pages.length > 0 || semaine.mots_exemple.length > 0
}

function estNumeroSemaine(numero: number): boolean {
  return Number.isInteger(numero) && numero >= 1 && numero <= 36
}

function copierSemaine(semaine: ProgressionSemaine): ProgressionSemaine {
  return {
    numero: semaine.numero,
    items: [...semaine.items],
    pages: semaine.pages,
    mots_exemple: [...semaine.mots_exemple],
  }
}

function estNumeroPeriode(valeur: unknown): valeur is NumeroPeriode {
  return typeof valeur === 'number' && Number.isInteger(valeur) && valeur >= 1 && valeur <= 5
}

function estDateIso(valeur: unknown): valeur is string {
  return typeof valeur === 'string'
    && /^\d{4}-\d{2}-\d{2}T/.test(valeur)
    && Number.isFinite(Date.parse(valeur))
}

function canonicaliser(valeur: unknown): unknown {
  if (valeur === null || typeof valeur === 'string' || typeof valeur === 'boolean') return valeur
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : null
  if (Array.isArray(valeur)) return valeur.map(canonicaliser)
  if (!estObjet(valeur)) return null

  return Object.fromEntries(
    Object.entries(valeur)
      .filter(([, contenu]) => contenu !== undefined)
      .sort(([cleA], [cleB]) => (cleA < cleB ? -1 : cleA > cleB ? 1 : 0))
      .map(([cle, contenu]) => [cle, canonicaliser(contenu)]),
  )
}
