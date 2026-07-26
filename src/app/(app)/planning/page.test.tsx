import fs from 'node:fs'
import path from 'node:path'

describe('page planning annuel', () => {
  test('lit les progressions et les méthodes puis construit le modèle multi-matières', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(app)/planning/page.tsx'),
      'utf8',
    )

    expect(source).toContain("from('progression')")
    expect(source).toContain("from('methodes')")
    expect(source).toContain('numero, matiere, methode_id, items, pages, mots_exemple')
    expect(source).toContain('id, matiere, manuel, suivi_actif')
    expect(source).toContain('semaine_id, eleve_id, matiere, grapheme')
    expect(source).toContain(".eq('acquis', true)")
    expect(source).toContain('construirePlanningAnnuel(')
    expect(source).not.toContain("from '@/data/manuels'")
    expect(source).not.toMatch(/items:\s*s\.graphemes/)
    expect(source).not.toContain('acquisParSemaine')
  })
})
