import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function lireMigration(nom: string) {
  return readFileSync(join(process.cwd(), 'supabase', 'migrations', nom), 'utf8')
    .replace(/\r\n/g, '\n')
}

function fonctionPageSemaine(sql: string) {
  const fonction = sql.match(
    /create or replace function public\.page_semaine\(p_id uuid\)[\s\S]*?\$\$;/i,
  )?.[0]

  expect(fonction).toBeDefined()
  return fonction as string
}

describe('migration 030 de la page semaine', () => {
  test('ajoute seulement date_debut aux semaines rendues par page_semaine', () => {
    const chemin030 = join(
      process.cwd(),
      'supabase',
      'migrations',
      '030_page_semaine_date_debut.sql',
    )

    expect(existsSync(chemin030)).toBe(true)
    if (!existsSync(chemin030)) return

    const fonction025 = fonctionPageSemaine(lireMigration('025_pages_en_un_appel.sql'))
    const fonction030 = fonctionPageSemaine(lireMigration('030_page_semaine_date_debut.sql'))
    const ancienBloc = "'id', sc.id, 'numero', sc.numero, 'periode_numero', sc.periode_numero)"
    const nouveauBloc =
      "'id', sc.id, 'numero', sc.numero, 'periode_numero', sc.periode_numero, " +
      "'date_debut', sc.date_debut)"

    expect(fonction025.split(ancienBloc)).toHaveLength(2)
    expect(fonction030).toBe(fonction025.replace(ancienBloc, nouveauBloc))
  })
})
