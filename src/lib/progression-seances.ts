import type { SeanceProgression } from '@/types'

/**
 * Marqueur de jour en tête d'un item : « Jour 2 : Grammaire ».
 *
 * Depuis que `cahier-journal.ts` importe cette regex au lieu de la
 * redéfinir, c'est le SEUL endroit du dépôt qui connaît cette convention.
 * Elle date de l'époque où la table n'avait pas de colonne pour la journée :
 * le jour ne survivait que dans le texte.
 *
 * Grammaire exacte, à reproduire à l'identique côté SQL le jour où une
 * migration remplira une colonne "seances" en base directement (ce
 * commentaire sert de contrat pour cette migration future) :
 *
 * - insensible à la casse ("Jour", "JOUR", "jour" acceptés) ;
 * - "jour" ou "jours", le "s" final est optionnel ;
 * - un ou plusieurs chiffres pour le numéro (deux chiffres acceptés,
 *   "Jour 12" par exemple) ;
 * - cinq séparateurs acceptés juste après le numéro : `:` `.` `-` (tiret
 *   simple), `–` (tiret demi-cadratin, U+2013) et le tiret cadratin U+2014
 *   (non reproduit ici tel quel, en dehors de la classe de caractères du
 *   regex, par cohérence avec la règle du dépôt) ;
 * - des espaces libres avant "jour", autour du numéro et après le
 *   séparateur.
 *
 * Piège pour une implémentation SQL : `\s` en JavaScript couvre l'espace
 * insécable U+00A0 (et d'autres espaces Unicode), alors que la classe POSIX
 * `[[:space:]]` de Postgres ne couvre en général PAS U+00A0. Un document
 * collé depuis Word qui commence une puce par un espace insécable serait
 * donc reconnu ici mais pas par un `regexp_replace` naïf côté base : il
 * faudra y ajouter U+00A0 explicitement dans la classe de caractères
 * d'espace pour que la colonne remplie en SQL ne diverge jamais de ce calcul
 * applicatif.
 */
export const PREFIXE_JOUR = /^\s*jours?\s*(\d+)\s*[:.\-–—]\s*/i

/**
 * Domaine = ce qui précède les deux points, quand c'est court.
 *
 * « LC : La petite poule » donne "LC". Une phrase entière suivie de deux
 * points n'est pas un domaine : au-delà de `MAX_LONGUEUR_DOMAINE` caractères
 * on renonce plutôt que de couper une phrase au hasard.
 *
 * Deux limites connues, non corrigées ici : le SQL n'a pas à les reproduire,
 * elles dégradent seulement la qualité du champ "domaine", jamais la perte
 * de texte (le libellé, lui, reste intact).
 *
 * - Toute ponctuation à deux points assez tôt dans le texte est prise pour
 *   un domaine : "8:30 accueil" donne le domaine "8".
 * - "Jours 3-4 : révisions" se lit comme "Jour 3" suivi du libellé
 *   "4 : révisions", parce que le tiret séparant un intervalle de jours est
 *   le même caractère que le séparateur de préfixe.
 */
const MAX_LONGUEUR_DOMAINE = 30

function domaineDe(libelle: string): string {
  const coupe = libelle.indexOf(':')
  if (coupe < 1 || coupe > MAX_LONGUEUR_DOMAINE) return ''
  return libelle.slice(0, coupe).trim()
}

/**
 * Numéro de jour valide au sens de la convention : un entier strictement
 * positif, pas seulement une valeur "vraie" (donc ni `0`, ni `NaN`, ni
 * négatif, ni décimal). Seule définition du dépôt : `jourValide`,
 * `seancesDepuisItems` et `numeroJourItem` (`cahier-journal.ts`) s'en
 * servaient chacun à sa façon avant, la même dérive à trois branches que
 * celle déjà fermée sur la regex `PREFIXE_JOUR`.
 */
export function estJourValide(n: number): boolean {
  return Number.isInteger(n) && n > 0
}

/** Jour valide au sens de la convention : un entier strictement positif, pas seulement une valeur "vraie". */
function jourValide(jour: number | null): jour is number {
  return jour !== null && estJourValide(jour)
}

/**
 * Convertit un élément potentiellement non-string en texte, sans jamais
 * supprimer du contenu écrit par l'enseignante. `items` peut venir tel quel
 * d'une colonne JSONB Supabase, où un nombre, un booléen, un `null` isolé,
 * ou même un objet ou un tableau mal formé, sont possibles.
 *
 * Le critère est le sens, pas la littéralité : un nombre, un booléen ou un
 * `bigint` EST du contenu, il devient sa représentation texte ("42",
 * "true"). Un `null`, un `undefined`, ou un objet/tableau ne sont PAS du
 * texte écrit par l'enseignante : ils deviennent "" pour être filtrés comme
 * une entrée vide, plutôt que de s'afficher tels quels ("null",
 * "[object Object]") dans un cahier journal.
 */
function aTexte(item: unknown): string {
  if (typeof item === 'string') return item
  if (typeof item === 'number' || typeof item === 'boolean' || typeof item === 'bigint') {
    return String(item)
  }
  return ''
}

/**
 * Relit les items bruts d'une ligne de progression pour en faire des
 * séances.
 *
 * Le préfixe n'est retiré du libellé QUE si son numéro est retenu comme
 * jour valide : les deux décisions sont prises ensemble. Sinon
 * "Jour 0 : Rentrée" perdrait le texte de l'enseignante en route (jour
 * rejeté, mais préfixe quand même effacé), ce qui casserait l'aller-retour
 * avec `itemsDepuisSeances` que la future migration SQL doit pouvoir
 * reproduire à l'identique.
 *
 * L'ordre des séances rendues suit l'ordre des items non vides, MAIS PAS
 * leur index d'origine : les entrées vides sont filtrées, donc `seances[i]`
 * ne correspond plus forcément à `items[i]`. Une tâche qui a besoin de
 * recoller une séance à sa position dans `items` devra le faire autrement
 * (par exemple en gardant les entrées vides plutôt qu'en les filtrant).
 *
 * `items` est typé `unknown[]` plutôt que `string[]` pour que le garde-fou
 * contre un élément non-string soit réellement atteignable et testable, pas
 * du code mort masqué par le typage. `items` absent ou `null` rend un
 * tableau vide plutôt que de jeter.
 */
export function seancesDepuisItems(items: unknown[] | null | undefined): SeanceProgression[] {
  return (items ?? [])
    .map(aTexte)
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const trouve = item.match(PREFIXE_JOUR)
      const numero = trouve ? Number(trouve[1]) : NaN
      const jour = estJourValide(numero) ? numero : null
      const libelle = jour !== null && trouve ? item.slice(trouve[0].length).trim() : item
      return { jour, domaine: domaineDe(libelle), libelle }
    })
}

/**
 * Reconstruit les items texte à partir des séances, pour tout ce qui lit
 * encore `items` (l'affichage existant, en attendant une migration qui
 * lirait des séances directement).
 *
 * Idempotente : si `libelle` porte déjà un préfixe "Jour N :" (l'IA qui
 * remplit `seances` recopie volontiers la puce entière), il est retiré
 * avant de reposer le préfixe issu du champ `jour`, pour ne jamais doubler
 * en "Jour 3 : Jour 3 : Fluence".
 *
 * Quand `jour` n'est pas un entier strictement positif (`null`, `0`, une
 * valeur négative ou non entière comme `2.5`), le libellé est rendu tel
 * quel, préfixe éventuel compris : on ne touche pas à du texte qu'on ne
 * peut pas réattribuer avec certitude à un jour.
 *
 * Le champ `jour` gagne TOUJOURS en silence sur un préfixe texte
 * contradictoire : si `libelle` porte "Jour 5 :" mais que `jour` vaut `3`,
 * le rendu dit "Jour 3 :", le "5" du texte disparaît sans avertissement.
 * C'est le seul endroit du module où du texte peut encore se perdre ainsi ;
 * en pratique le cas ne devrait pas se produire, `jour` et le préfixe de
 * `libelle` étant censés être posés ensemble.
 */
export function itemsDepuisSeances(seances: SeanceProgression[]): string[] {
  return seances.map(s => {
    if (!jourValide(s.jour)) return s.libelle
    const libelleSansPrefixe = s.libelle.replace(PREFIXE_JOUR, '').trim()
    return `Jour ${s.jour} : ${libelleSansPrefixe}`
  })
}
