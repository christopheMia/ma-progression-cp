import fs from 'node:fs'
import path from 'node:path'

describe('page Paramètres et documents de progression', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/app/(app)/parametres/page.tsx'),
    'utf8',
  )

  // Ce test exigeait le garde `if (methodeIds.length > 0)`, qui evitait une
  // requete `in(...)` sur une liste vide. Le 29/07/2026, les documents ont
  // cesse d'etre filtres par une liste d'identifiants : ils passent par une
  // jointure interne sur la classe, parce que la liste obligeait a ATTENDRE la
  // requete des methodes, et cette page enchainait deja sept allers-retours en
  // serie (2,08 s mesurees). Le risque couvert par le garde a disparu avec la
  // liste : la requete est bornee a la classe, toujours.
  test('demande les documents en une fois, bornés à la classe', () => {
    expect(source).toMatch(/from\('methode_sources'\)/)
    expect(source).toMatch(/methodes!inner\(class_id\)/)
    expect(source).toMatch(/eq\('methodes\.class_id'/)
    expect(source).not.toMatch(/\.in\('methode_id'/)
  })

  // Le vrai gain, et ce qu'il ne faut pas defaire : une seule vague de
  // requetes, pas une file.
  test('charge ses données en parallèle, pas l’une après l’autre', () => {
    expect(source).toMatch(/await mesurer\('parametres', \(\) => Promise\.all\(/)
  })

  test('transmet les sources et ne réintroduit pas l’ancien changement de manuel', () => {
    expect(source).toContain('sources={sources}')
    expect(source).not.toContain('MANUELS')
    expect(source).not.toContain('ManuelEditor')
    expect(source).not.toContain('Tout régénérer')
  })
})
