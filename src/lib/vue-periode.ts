// src/lib/vue-periode.ts
//
// Agregation "periode d'abord" : pour chaque periode scolaire (P1-P5), la liste
// des notions travaillees, regroupees par matiere, toutes matieres confondues.
//
// C'est le pendant de la page "programme couvert" (qui range matiere d'abord et
// se limite au francais/maths pour le livret). Ici on veut la vue d'ensemble
// d'une periode complete : ce qui se travaille sur la periode, quelle que soit
// la matiere (francais par semaine, maths etale sur les semaines de la periode,
// et les matieres saisies a la main).
//
// Fonction pure, testee a part. Le cumul lui-meme reste deterministe : chaque
// item de progression est range dans la periode de sa semaine.

/** Une ligne de progression, telle que lue en base (table `progression`). */
export type ItemProgression = { matiere: string; numero: number; items: string[] }

/** Le contenu d'une matiere sur une periode : ses notions, sans doublon. */
export type MatierePeriode = { matiere: string; notions: string[] }

/** Une periode et tout ce qui s'y travaille. `periode` vaut null hors periode. */
export type BlocPeriode = { periode: number | null; matieres: MatierePeriode[] }

/**
 * Ordre d'affichage des matieres : les deux matieres cadrantes d'abord, puis
 * les autres par ordre alphabetique (matieres personnalisees, EPS, arts...).
 */
function ordreMatiere(matiere: string): [number, string] {
  const cadre = ['francais', 'maths']
  const i = cadre.indexOf(matiere)
  return i >= 0 ? [i, matiere] : [cadre.length, matiere]
}

/**
 * Regroupe les items de progression par periode puis par matiere.
 *
 * @param progression  lignes de la table `progression` (matiere, numero, items)
 * @param periodeParSemaine  numero de semaine -> numero de periode (ou null)
 */
export function agregerParPeriode(
  progression: ItemProgression[],
  periodeParSemaine: Map<number, number | null>,
): BlocPeriode[] {
  // periode -> matiere -> notions ordonnees sans doublon
  const parPeriode = new Map<number | null, Map<string, string[]>>()
  const vus = new Map<string, Set<string>>() // cle periode|matiere -> notions vues

  // On respecte l'ordre des semaines puis des items pour une lecture naturelle.
  const lignes = [...progression].sort((a, b) => a.numero - b.numero)
  for (const ligne of lignes) {
    const per = periodeParSemaine.get(ligne.numero) ?? null
    for (const brut of ligne.items ?? []) {
      const notion = (brut ?? '').trim()
      if (!notion) continue
      const cle = `${per}|${ligne.matiere}`
      const dejaVues = vus.get(cle) ?? new Set<string>()
      if (dejaVues.has(notion.toLowerCase())) continue
      dejaVues.add(notion.toLowerCase())
      vus.set(cle, dejaVues)

      const matieres = parPeriode.get(per) ?? new Map<string, string[]>()
      const notions = matieres.get(ligne.matiere) ?? []
      notions.push(notion)
      matieres.set(ligne.matiere, notions)
      parPeriode.set(per, matieres)
    }
  }

  return [...parPeriode.entries()]
    .sort((a, b) => (a[0] ?? 99) - (b[0] ?? 99))
    .map(([periode, matieres]) => ({
      periode,
      matieres: [...matieres.entries()]
        .sort((a, b) => {
          const [oa, na] = ordreMatiere(a[0])
          const [ob, nb] = ordreMatiere(b[0])
          return oa - ob || na.localeCompare(nb)
        })
        .map(([matiere, notions]) => ({ matiere, notions })),
    }))
}
