import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const migration = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '031_regles_rangement.sql'),
  'utf8',
).replace(/\r\n/g, '\n')

describe('migration du carnet de rangement', () => {
  test('crée une seule table, sans toucher aux autres', () => {
    expect(migration).toMatch(/create table if not exists public\.regles_rangement/i)
    expect(migration).not.toMatch(/alter table public\.(?!regles_rangement)/i)
    expect(migration).not.toMatch(/drop |delete from /i)
  })

  test('une règle par type et par classe, effacée avec la classe', () => {
    expect(migration).toMatch(/class_id uuid references public\.classes on delete cascade not null/i)
    expect(migration).toMatch(/unique \(class_id, type_cle\)/i)
    expect(migration).toMatch(/jour in \('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'\)/i)
    expect(migration).toMatch(/origine in \('main', 'cahier', 'ia'\)/i)
  })

  test('réservée au propriétaire de la classe', () => {
    expect(migration).toMatch(/enable row level security/i)
    expect(migration).toMatch(/for all\s+to authenticated/i)
    expect(migration.match(/c\.user_id = \(select auth\.uid\(\)\)/gi)).toHaveLength(2)
    expect(migration).toMatch(/with check/i)
    expect(migration).toMatch(/revoke all on table public\.regles_rangement from anon, authenticated/i)
    expect(migration).toMatch(/grant select, insert, update, delete on table public\.regles_rangement to authenticated/i)
  })
})
