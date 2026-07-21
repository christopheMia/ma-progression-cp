// src/lib/edt-grille.ts
//
// Calcul de la disposition de la grille d'emploi du temps.
//
// PROBLEME RESOLU (retour de Christophe, 21/07/2026) :
// l'ancienne grille construisait une ligne par couple (debut, fin) DISTINCT.
// Quand un jour posait une seance de 11:00 a 11:30 et qu'un autre decoupait la
// meme demi-heure en trois blocs de 10 min, on obtenait quatre lignes, et la
// seance du premier jour n'apparaissait que dans une seule : les trois autres
// semblaient vides alors qu'il ne s'y passait rien de special.
//
// Nouveau modele : les lignes sont les intervalles entre FRONTIERES horaires,
// et chaque seance est rendue UNE SEULE FOIS, avec un `rowSpan` egal au nombre
// d'intervalles qu'elle couvre. Aucune donnee n'est modifiee, seule la
// disposition change.

export type CreneauMin = {
  jour: string
  heure_debut: string
  heure_fin: string
}

export type LigneGrille = { debut: string; fin: string }

/**
 * Etat d'une case (jour x ligne) :
 *  - `seance`   : une seance commence ici, elle occupe `span` lignes ;
 *  - `couverte` : une seance commencee plus haut occupe cette case, il ne faut
 *                 emettre AUCUN <td> (c'est le rowSpan du dessus qui la remplit) ;
 *  - `libre`    : rien de prevu, la case est reellement vide.
 */
export type CaseGrille<T> =
  | { etat: 'seance'; creneau: T; span: number }
  | { etat: 'couverte' }
  | { etat: 'libre' }

/** Toutes les frontieres horaires distinctes, triees chronologiquement. */
export function frontieres(creneaux: CreneauMin[]): string[] {
  const t = new Set<string>()
  for (const c of creneaux) {
    t.add(c.heure_debut)
    t.add(c.heure_fin)
  }
  return [...t].sort((a, b) => a.localeCompare(b))
}

/** Lignes de la grille : un intervalle entre deux frontieres consecutives. */
export function lignesGrille(creneaux: CreneauMin[]): LigneGrille[] {
  const f = frontieres(creneaux)
  const out: LigneGrille[] = []
  for (let i = 0; i < f.length - 1; i++) out.push({ debut: f[i], fin: f[i + 1] })
  return out
}

/**
 * Construit la disposition complete.
 *
 * `cases[indexLigne][indexJour]` dit quoi rendre. Les seances qui se
 * chevauchent sur un meme jour (donnees incoherentes) ne cassent pas la
 * grille : la premiere rencontree gagne, les suivantes sont ignorees plutot
 * que de decaler toutes les colonnes.
 */
export function construireGrille<T extends CreneauMin>(
  creneaux: T[],
  jours: string[],
): { lignes: LigneGrille[]; cases: CaseGrille<T>[][] } {
  const lignes = lignesGrille(creneaux)
  const cases: CaseGrille<T>[][] = lignes.map(() => jours.map(() => ({ etat: 'libre' as const })))

  for (let j = 0; j < jours.length; j++) {
    const duJour = creneaux
      .filter(c => c.jour === jours[j])
      .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))

    // Jusqu'ou va la derniere seance posee : sert a ignorer un chevauchement.
    let finPosee = ''

    for (const c of duJour) {
      if (c.heure_debut < finPosee) continue // chevauchement : on ignore
      const iDebut = lignes.findIndex(l => l.debut === c.heure_debut)
      if (iDebut < 0) continue

      // Nombre de lignes couvertes, de la ligne de depart jusqu'a `heure_fin`.
      let span = 0
      while (iDebut + span < lignes.length && lignes[iDebut + span].debut < c.heure_fin) span++
      if (span === 0) continue

      cases[iDebut][j] = { etat: 'seance', creneau: c, span }
      for (let k = 1; k < span; k++) cases[iDebut + k][j] = { etat: 'couverte' }
      finPosee = c.heure_fin
    }
  }

  return { lignes, cases }
}

/**
 * Creneaux concernes par une ligne, pour les actions qui portent sur la ligne
 * entiere (passer en routine, masquer du cahier journal, supprimer).
 *
 * On retient tout creneau qui CHEVAUCHE la ligne. Pour les lignes uniformes
 * (recreation, cantine, accueil : les memes horaires sur les quatre jours),
 * c'est exactement l'ancien comportement.
 */
export function creneauxDeLaLigne<T extends CreneauMin>(creneaux: T[], ligne: LigneGrille): T[] {
  return creneaux.filter(c => c.heure_debut < ligne.fin && c.heure_fin > ligne.debut)
}
