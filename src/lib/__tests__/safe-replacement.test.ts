import { remplacerSansPerte } from '../safe-replacement'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('remplacerSansPerte', () => {
  test('ne supprime jamais les anciennes lignes si insertion echoue', async () => {
    const supprimer = jest.fn(async (_ids: string[]) => undefined)

    await expect(remplacerSansPerte({
      anciensIds: ['ancien-1'],
      insererNouveau: async () => { throw new Error('insertion impossible') },
      supprimerIds: supprimer,
    })).rejects.toThrow('insertion impossible')

    expect(supprimer).not.toHaveBeenCalled()
  })

  test('supprime les anciennes lignes apres insertion complete', async () => {
    const appels: string[][] = []

    await remplacerSansPerte({
      anciensIds: ['ancien-1', 'ancien-2'],
      insererNouveau: async () => ['nouveau-1'],
      supprimerIds: async ids => { appels.push(ids) },
    })

    expect(appels).toEqual([['ancien-1', 'ancien-2']])
  })

  test('retire les nouvelles lignes si suppression anciennes echoue', async () => {
    const appels: string[][] = []

    await expect(remplacerSansPerte({
      anciensIds: ['ancien-1'],
      insererNouveau: async () => ['nouveau-1'],
      supprimerIds: async ids => {
        appels.push(ids)
        if (ids[0] === 'ancien-1') throw new Error('suppression impossible')
      },
    })).rejects.toThrow('suppression impossible')

    expect(appels).toEqual([['ancien-1'], ['nouveau-1']])
  })

  test('la migration multi-methodes cree appreciations avant de la modifier', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase', 'migrations', '003_multi_methodes.sql'),
      'utf8',
    )
    const creation = migration.indexOf('create table if not exists appreciations')
    const modification = migration.indexOf('alter table appreciations add column matiere')

    expect(creation).toBeGreaterThanOrEqual(0)
    expect(modification).toBeGreaterThan(creation)
  })

  test('les imports de progression passent par le remplacement atomique', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase', 'migrations', '014_remplacement_progression_atomique.sql'),
      'utf8',
    )
    expect(migration).toContain('create or replace function remplacer_progression')

    for (const nom of [
      'progression-ia.ts',
      'progression-matiere.ts',
      'progression-periode.ts',
      'progression-programmation.ts',
    ]) {
      const source = readFileSync(join(process.cwd(), 'src', 'lib', 'actions', nom), 'utf8')
      expect(source).toContain("rpc('remplacer_progression'")
      expect(source).not.toContain("from('progression').delete()")
    }
  })
})
