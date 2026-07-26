import fs from 'node:fs'
import path from 'node:path'

describe('page Paramètres et documents de progression', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/app/(app)/parametres/page.tsx'),
    'utf8',
  )

  test('ne demande les sources que lorsque des méthodes existent', () => {
    expect(source).toContain('if (methodeIds.length > 0)')
    expect(source).toContain(".from('methode_sources')")
    expect(source).toContain(".in('methode_id', methodeIds)")
    expect(source).toContain(".order('created_at')")
    expect(source).not.toContain(".in('methode_id', [])")
  })

  test('transmet les sources et ne réintroduit pas l’ancien changement de manuel', () => {
    expect(source).toContain('sources={sources}')
    expect(source).not.toContain('MANUELS')
    expect(source).not.toContain('ManuelEditor')
    expect(source).not.toContain('Tout régénérer')
  })
})
