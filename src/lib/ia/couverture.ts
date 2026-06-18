const norm = (s: string) => s.trim().toLowerCase()

/** Renvoie les notions de `reference` qui n'apparaissent dans AUCUNE semaine placee. */
export function notionsManquantes(
  reference: string[],
  placees: Array<{ items: string[] }>,
): string[] {
  const placeesSet = new Set(placees.flatMap(p => p.items.map(norm)))
  return reference.filter(n => !placeesSet.has(norm(n)))
}
