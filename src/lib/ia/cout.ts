/**
 * Ce que coute reellement un appel a l IA.
 *
 * L ancienne version ne comptait que `input_tokens` et `output_tokens`. Or
 * l API renvoie QUATRE compteurs, et `input_tokens` ne contient que la part
 * NON mise en cache. Les routes qui utilisent le cache de prompt (l assistant
 * et le chat) voyaient donc l essentiel de leur consommation disparaitre.
 *
 * Constat du 30/07/2026 : la jauge affichait 0,18 $ pendant que la console
 * Anthropic en comptait 3,26. Un facteur 18.
 */

export type UsageIA = {
  /** Tokens d entree factures plein tarif (hors cache). */
  input: number
  /** Tokens ecrits dans le cache : 1,25 fois le tarif d entree. */
  cacheCreation: number
  /** Tokens relus depuis le cache : un dixieme du tarif d entree. */
  cacheRead: number
  /** Tokens ecrits par le modele. */
  output: number
}

const USAGE_VIDE: UsageIA = { input: 0, cacheCreation: 0, cacheRead: 0, output: 0 }

/** Tarifs officiels, en dollars par million de tokens. */
export const TARIFS_USD_PAR_MTOK: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-haiku-4-5': { input: 1, output: 5 },
}

/** Multiplicateurs de cache appliques au tarif d entree du modele. */
const MULT_ECRITURE_CACHE = 1.25
const MULT_LECTURE_CACHE = 0.1

/**
 * Le tarif le plus cher connu, utilise quand le modele n est pas au catalogue.
 *
 * `anthropic.ts` invite a repasser sur Opus si le plan Vercel monte. Le jour ou
 * ca arrivera, personne ne pensera a revenir ici. Surestimer est le seul defaut
 * acceptable pour un compteur de budget : on prefere une alerte en avance a une
 * carte vide sans preavis.
 */
function tarif(modele: string) {
  const connu = TARIFS_USD_PAR_MTOK[modele]
  if (connu) return connu
  const tous = Object.values(TARIFS_USD_PAR_MTOK)
  return {
    input: Math.max(...tous.map(t => t.input)),
    output: Math.max(...tous.map(t => t.output)),
  }
}

/** Cout en dollars d un appel, cache compris. */
export function coutUsd(modele: string, usage: UsageIA): number {
  const { input, output } = tarif(modele)
  const parToken = (prixParMtok: number) => prixParMtok / 1_000_000
  return (
    usage.input * parToken(input)
    + usage.cacheCreation * parToken(input * MULT_ECRITURE_CACHE)
    + usage.cacheRead * parToken(input * MULT_LECTURE_CACHE)
    + usage.output * parToken(output)
  )
}

export type LigneCout = { cout_usd: unknown; created_at: string | null }

/**
 * Somme des couts a partir du releve (ou de tout, sans releve).
 *
 * Ce filtre etait un `gte` SQL, ce qui obligeait a lire le releve AVANT de
 * demander les lignes : deux allers-retours en serie a chaque affichage de la
 * jauge, au plancher de ~150 ms l appel Supabase (mesure le 29/07). Filtrer
 * ici, en memoire, permet de lancer les deux requetes dans la meme vague.
 * Meme regle que le `gte` : une ligne datee exactement du releve compte.
 */
export function sommeCoutDepuis(lignes: LigneCout[], releveAt: string | null): number {
  const seuil = releveAt ? Date.parse(releveAt) : null
  return lignes.reduce((somme, ligne) => {
    if (seuil !== null) {
      const date = ligne.created_at ? Date.parse(ligne.created_at) : NaN
      // Une ligne sans date ne peut pas etre situee par rapport au releve :
      // ecartee (NaN echoue toute comparaison, c est le comportement voulu).
      if (!(date >= seuil)) return somme
    }
    const cout = Number(ligne.cout_usd ?? 0)
    return somme + (Number.isFinite(cout) ? cout : 0)
  }, 0)
}

function entier(valeur: unknown): number {
  return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : 0
}

/**
 * Extrait les quatre compteurs de l objet `usage` renvoye par le SDK.
 *
 * Volontairement tolerant : un champ manquant vaut zero plutot que NaN, parce
 * qu un compteur de budget ne doit jamais faire echouer la reponse a l ecran.
 */
export function usageDepuisReponse(usage: unknown): UsageIA {
  if (!usage || typeof usage !== 'object') return { ...USAGE_VIDE }
  const u = usage as Record<string, unknown>
  return {
    input: entier(u.input_tokens),
    cacheCreation: entier(u.cache_creation_input_tokens),
    cacheRead: entier(u.cache_read_input_tokens),
    output: entier(u.output_tokens),
  }
}
