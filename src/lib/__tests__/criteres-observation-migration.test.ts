import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const migration = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '018_criteres_observation.sql'),
  'utf8',
).replace(/\r\n/g, '\n')

describe('migration des critères d’observation', () => {
  test('reste additive et conserve les acquisitions historiques', () => {
    expect(migration).toMatch(/create table if not exists public\.criteres_observation/i)
    expect(migration).toMatch(/create table if not exists public\.acquisitions_criteres/i)
    expect(migration).not.toMatch(/alter table public\.acquisitions\b/i)
    expect(migration).not.toMatch(/delete from public\.acquisitions\b/i)
  })

  test('supprime seulement les résultats liés à un critère retiré', () => {
    expect(migration).toMatch(
      /critere_id uuid references public\.criteres_observation on delete cascade/i,
    )
    expect(migration).toMatch(/primary key \(critere_id, eleve_id\)/i)
  })

  test('protège les deux tables par les droits de la classe et le RLS', () => {
    expect(migration.match(/enable row level security/gi)).toHaveLength(2)
    expect(migration.match(/for all\s+to authenticated/gi)).toHaveLength(2)
    expect(migration).toMatch(/c\.user_id = \(select auth\.uid\(\)\)/i)
    expect(migration).toMatch(/e\.class_id = s\.class_id/i)
    expect(migration.match(/with check/gi)).toHaveLength(2)
    expect(migration).toMatch(
      /grant select, insert, update, delete[\s\S]+to authenticated/i,
    )
  })
})
