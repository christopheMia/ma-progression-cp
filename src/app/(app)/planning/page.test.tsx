import fs from 'node:fs'
import path from 'node:path'

describe('page planning annuel', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/app/(app)/planning/page.tsx'),
    'utf8',
  )

  // Depuis la migration 025, la page fait UN aller-retour (fonction SQL
  // page_planning) au lieu de classe + une vague de six requetes. Le
  // chronometrage du 30/07 avait montre que la vague se serialisait en partie
  // a l'ouverture des connexions (145 ms la premiere, ~330 ms les suivantes).
  test('charge tout en un seul appel, sans requete de table directe', () => {
    expect(source).toContain("rpc('page_planning')")
    expect(source).not.toContain('.from(')
    expect(source).not.toContain('Promise.all')
  })

  test('construit le modèle multi-matières depuis les données de la fonction', () => {
    expect(source).toContain('construirePlanningAnnuel(')
    // Les regressions d'avant le multi-methodes ne doivent pas revenir.
    expect(source).not.toContain("from '@/data/manuels'")
    expect(source).not.toMatch(/items:\s*s\.graphemes/)
    expect(source).not.toContain('acquisParSemaine')
  })
})
