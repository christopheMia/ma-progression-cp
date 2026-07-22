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
