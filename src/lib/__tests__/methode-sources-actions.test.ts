import fs from 'node:fs'
import path from 'node:path'

describe('Server Actions des sources de méthode', () => {
  test('utilise uniquement les RPC pour les sources et la progression', () => {
    const fichier = path.join(
      process.cwd(),
      'src/lib/actions/methode-sources.ts',
    )
    const source = fs.readFileSync(fichier, 'utf8')

    expect(source).toContain("'enregistrer_source_progression'")
    expect(source).toContain("'retirer_source_progression'")
    expect(source).not.toMatch(/from\(['"]methode_sources['"]\)\.(?:insert|update|delete|upsert)/)
    expect(source).not.toMatch(/from\(['"]progression['"]\)\.(?:insert|update|delete|upsert)/)
    expect(source).not.toContain('.in([])')
  })

  test('revalide toutes les vues qui consomment la progression', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/actions/methode-sources.ts'),
      'utf8',
    )

    for (const route of ['/parametres', '/planning', '/periodes', '/accueil']) {
      expect(source).toContain(`revalidatePath('${route}')`)
    }
    expect(source).toContain("revalidatePath(`/semaine/${semaineId}`)")
  })
})
