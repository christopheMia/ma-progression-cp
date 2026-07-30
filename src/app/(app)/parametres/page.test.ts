import fs from 'node:fs'
import path from 'node:path'

describe('page Paramètres et documents de progression', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/app/(app)/parametres/page.tsx'),
    'utf8',
  )

  // L'histoire de cette page est une lecon de latence. Sept requetes en serie
  // (2,08 s mesurees le 29/07), puis deux vagues, puis UN SEUL appel : la
  // fonction SQL `page_parametres` (migration 025) rend classe, eleves, emploi
  // du temps, methodes, progression, documents et solde IA ensemble, parce que
  // chaque appel Supabase coute 120 a 360 ms quelle que soit la table.
  test('charge tout en un seul appel, sans requete de table directe', () => {
    expect(source).toContain("rpc('page_parametres')")
    expect(source).not.toContain('.from(')
    expect(source).not.toContain('Promise.all')
  })

  test('transmet les sources et ne réintroduit pas l’ancien changement de manuel', () => {
    expect(source).toContain('sources={sources}')
    expect(source).not.toContain('MANUELS')
    expect(source).not.toContain('ManuelEditor')
    expect(source).not.toContain('Tout régénérer')
  })
})
