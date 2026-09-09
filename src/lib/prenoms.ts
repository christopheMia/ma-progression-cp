// src/lib/prenoms.ts
//
// Découpe un texte libre en une liste de prénoms.
//
// Sert à la saisie groupée des élèves : l'enseignant colle sa liste de classe
// d'un coup (un prénom par ligne, ou séparés par des virgules) au lieu de les
// taper un par un. Fonction pure, testée à part.

/** Retours à la ligne, virgules, points-virgules et tabulations séparent. */
const SEPARATEURS = /[\n\r,;\t]+/

export function decouperPrenoms(texte: string): string[] {
  return texte
    .split(SEPARATEURS)
    .map(p => p.trim())
    .filter(Boolean)
}

/**
 * Classe une liste de prenoms dans l'ordre alphabetique francais.
 *
 * POURQUOI. Demande de Cecile le 9 septembre 2026, la seule qu'elle ait
 * formulee d'elle-meme quand on lui a demande ce qui lui faisait perdre du
 * temps : ses 24 eleves sont ranges dans l'ordre ou elle les a importes, donc
 * elle cherche un enfant dans une liste desordonnee, plusieurs fois par jour.
 *
 * POURQUOI `localeCompare` ET PAS UNE COMPARAISON SIMPLE. En francais, un E
 * accentue se range avec les E. Une comparaison sur les codes de caracteres
 * enverrait Emile apres Zoe, et la maitresse ne le trouverait pas la ou elle
 * regarde. `sensitivity: 'base'` ignore en plus la casse et les accents pour
 * departager, ce qui evite qu'un prenom saisi tout en majuscules parte a part.
 *
 * CE QUE CETTE FONCTION NE FAIT PAS, et c'est ce qui la rend sure : elle ne
 * retire, n'ajoute et ne modifie aucun prenom, et laisse intacte la liste
 * recue. Comme l'identite d'un eleve se fait par son prenom exact
 * (voir `updateEleves`), reordonner ne peut donc pas detacher un enfant de son
 * suivi.
 */
export function trierPrenoms(prenoms: string[]): string[] {
  return [...prenoms].sort((a, b) =>
    a.localeCompare(b, 'fr', { sensitivity: 'base' }),
  )
}
