import type { SoldeIA } from '@/lib/actions/ia-usage'
import type { Semaine } from '@/types'
import type { PeriodePlanning } from '@/components/planning/AnnualGrid'
import type {
  AcquisitionPlanning,
  MethodePlanning,
  ProgressionPlanning,
} from '@/lib/planning-annuel'

/**
 * Les donnees de page rendues en UN appel par les fonctions SQL de la
 * migration 025 (`page_accueil`, `page_planning`, `page_parametres`,
 * `page_semaine`).
 *
 * Pourquoi : mesure du 30/07/2026, un appel Supabase coute de 120 a 360 ms
 * quelle que soit la table, et les appels « paralleles » se serialisent en
 * partie a l'ouverture des connexions. Chaque page payait classe PUIS sa
 * vague (320 a 420 ms) ; une fonction SQL rend tout en ~150 ms.
 *
 * Les lignes portent les MEMES colonnes que les tables (les fonctions font
 * `to_jsonb(ligne)` ou les reconstruisent champ a champ) : le code des pages
 * lit les memes proprietes qu'avant la bascule. `Ligne` reste volontairement
 * souple, comme l'etaient les reponses non typees de supabase-js.
 */
export type Ligne = Record<string, any>

export type SoldeRpc = {
  solde_releve_usd: number | null
  releve_at: string | null
  consomme_usd: number
}

/** Traduit le bloc `solde` d'une fonction de page vers la forme de soldeIA(). */
export function soldeDepuisRpc(solde: SoldeRpc | null | undefined): SoldeIA {
  const releve = solde?.solde_releve_usd ?? null
  const consomme = Number(solde?.consomme_usd ?? 0)
  return {
    consommeUsd: consomme,
    restantUsd: releve === null ? null : Number(releve) - consomme,
    releveAt: solde?.releve_at ?? null,
    soldeReleveUsd: releve === null ? null : Number(releve),
  }
}

export type PageAccueilData = {
  classe: Ligne | null
  semaines: Semaine[]
  nb_eleves: number
  methodes: Ligne[]
  nb_acquis: number
  solde: SoldeRpc
}

export type PagePlanningData = {
  classe: Ligne | null
  semaines: Semaine[]
  eleves: Ligne[]
  periodes: PeriodePlanning[]
  progression: ProgressionPlanning[]
  methodes: MethodePlanning[]
  acquisitions: AcquisitionPlanning[]
}

export type PageParametresData = {
  classe: Ligne | null
  eleves: Ligne[]
  edt: Ligne[]
  methodes: Ligne[]
  progression: Ligne[]
  sources: Ligne[]
  solde: SoldeRpc
}

export type PageSemaineData = {
  semaine: Ligne | null
  eleves: Ligne[]
  acquisitions: Ligne[]
  appreciations: Ligne[]
  progression: Ligne[]
  methodes: Ligne[]
  edt: Ligne[]
  semaines_classe: Ligne[]
  comportements: Ligne[]
  observations: Ligne[]
  bilans_periode: Ligne[]
}
