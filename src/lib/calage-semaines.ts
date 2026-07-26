// src/lib/calage-semaines.ts
//
// Place les semaines rendues par l'IA dans l'ANNÉE RÉELLE de la classe.
//
// Règle qui gouverne ce module: aucune donnée n'est écartée en silence. Un trou
// dans la numérotation (une semaine de rentrée laissée vide par le manuel, par
// exemple) devient une ligne visible au lieu de disparaître et de décaler toute
// l'année d'un cran.
//
// Fonction pure: aucun appel réseau, aucune lecture d'horloge, aucun effet de
// bord sur les tableaux reçus. Les dates viennent OBLIGATOIREMENT de la même
// chaîne que la création de la classe (setup-creation.ts), sinon l'aperçu
// montrerait une date et l'application en enregistrerait une autre.

import type { ProgressionSemaine } from '@/data/manuels'
import { periodesOfficielles, type ZoneScolaire } from '@/lib/calendrier-officiel'
import { datesSemainesCalendaires } from '@/lib/calendrier-semaines'

export const MAX_SEMAINES_CALAGE = 36

/** Sur quoi le calage repose, donc à quel point il est sûr. */
export type BaseCalage = 'numeros' | 'dates' | 'ordre'

export type LigneCalage = {
  /** Numéro de semaine dans l'année de la classe, 1 à 36. */
  numero: number
  /** Lundi réel de cette semaine, ou '' si le calendrier officiel manque. */
  dateLundi: string
  /** Période 1 à 5, ou 0 si le calendrier officiel manque. */
  periodeNumero: number
  items: string[]
  pages: string
  motsExemple: string[]
  /** Trou dans la numérotation: aucune donnée du document ne tombe ici. */
  vide: boolean
}

export type Calage = {
  lignes: LigneCalage[]
  base: BaseCalage
  decalage: number
  /** Semaine de l'année sur laquelle tombe la première entrée du document. */
  semaineDepart: number
  avertissements: string[]
  peutAvancer: boolean
  peutReculer: boolean
}

export type OptionsCalage = {
  /** Semaines telles que rendues par l'IA, numéros compris. */
  semaines: ProgressionSemaine[]
  rentreeDate: string
  zone: ZoneScolaire
  base: BaseCalage
  /** Décalage appliqué aux numéros, en semaines. Défaut 0. */
  decalage?: number
}

function ligneVide(
  numero: number,
  dateLundi: string,
  periodeNumero: number,
): LigneCalage {
  return { numero, dateLundi, periodeNumero, items: [], pages: '', motsExemple: [], vide: true }
}

/**
 * Traduit « ma progression démarre en semaine N » en décalage à appliquer.
 *
 * L'enseignante raisonne en semaine de départ, pas en décalage. L'écran lui
 * pose donc la question dans ses termes, et cette fonction fait la conversion.
 */
export function decalagePourDemarrerEn(
  semaines: ProgressionSemaine[],
  semaineDepart: number,
): number {
  if (semaines.length === 0) return 0
  const premier = Math.min(...semaines.map(semaine => semaine.numero))
  return semaineDepart - premier
}

export function calerSemaines(opts: OptionsCalage): Calage {
  const decalage = opts.decalage ?? 0
  const avertissements: string[] = []

  // Le décalage s'applique AUX NUMÉROS d'abord. L'expansion des trous vient
  // ensuite, sinon un décalage fabriquerait de fausses semaines vides en tête.
  const decalees = opts.semaines
    .map(semaine => ({ ...semaine, numero: semaine.numero + decalage }))
    .sort((a, b) => a.numero - b.numero)

  const numeros = decalees.map(semaine => semaine.numero)
  const minimum = numeros.length ? Math.min(...numeros) : 1
  const maximum = numeros.length ? Math.max(...numeros) : 1

  const horsPlage = numeros.filter(numero => numero < 1 || numero > MAX_SEMAINES_CALAGE)
  if (horsPlage.length) {
    avertissements.push(
      `Ces semaines sortent de l'année scolaire (1 à ${MAX_SEMAINES_CALAGE}) : ${horsPlage.join(', ')}.`,
    )
  }

  const doublons = [...new Set(numeros.filter((numero, index) => numeros.indexOf(numero) !== index))]
  if (doublons.length) {
    avertissements.push(
      `Ces numéros de semaine apparaissent plusieurs fois : ${doublons.join(', ')}.`,
    )
  }

  // Exactement la chaîne de dates utilisée à la création de la classe.
  const periodes = periodesOfficielles(opts.rentreeDate, opts.zone)
  const calendrier = periodes.length === 5
    ? datesSemainesCalendaires(periodes, MAX_SEMAINES_CALAGE)
    : []
  if (calendrier.length === 0) {
    avertissements.push(
      "Le calendrier officiel de cette année scolaire n'est pas connu de l'application : les dates ne sont pas affichées.",
    )
  }
  const calendrierParNumero = new Map(calendrier.map(semaine => [semaine.numero, semaine]))

  const dernierNumero = Math.min(Math.max(maximum, 1), MAX_SEMAINES_CALAGE)
  const lignes: LigneCalage[] = []

  for (let numero = 1; numero <= dernierNumero; numero++) {
    const officielle = calendrierParNumero.get(numero)
    const dateLundi = officielle?.date_debut ?? ''
    const periodeNumero = officielle?.periode_numero ?? 0
    const semainesDuNumero = decalees.filter(semaine => semaine.numero === numero)

    if (semainesDuNumero.length === 0) {
      lignes.push(ligneVide(numero, dateLundi, periodeNumero))
      continue
    }
    // Un numéro en double produit deux lignes: on préfère montrer le doublon
    // plutôt que d'en perdre une moitié en silence.
    for (const semaine of semainesDuNumero) {
      lignes.push({
        numero,
        dateLundi,
        periodeNumero,
        items: semaine.items,
        pages: semaine.pages,
        motsExemple: semaine.mots_exemple,
        vide: false,
      })
    }
  }

  // Les semaines hors de 1 à 36 restent visibles, à la fin, jamais supprimées.
  for (const semaine of decalees) {
    if (semaine.numero >= 1 && semaine.numero <= MAX_SEMAINES_CALAGE) continue
    lignes.push({
      numero: semaine.numero,
      dateLundi: '',
      periodeNumero: 0,
      items: semaine.items,
      pages: semaine.pages,
      motsExemple: semaine.mots_exemple,
      vide: false,
    })
  }

  return {
    lignes,
    base: opts.base,
    decalage,
    semaineDepart: numeros.length ? minimum : 1,
    avertissements,
    peutAvancer: numeros.length > 0 && maximum + 1 <= MAX_SEMAINES_CALAGE,
    peutReculer: numeros.length > 0 && minimum - 1 >= 1,
  }
}
