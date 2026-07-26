import { remplacerSansPerte } from '../safe-replacement'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { MethodeSource, MethodeSourceBase } from '@/types'

function lireMigration(nom: string) {
  return readFileSync(join(process.cwd(), 'supabase', 'migrations', nom), 'utf8')
}

function normaliserSql(sql: string) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase()
}

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

describe('sources de progression atomiques', () => {
  test('la migration 016 cree la table contrainte et protegee par RLS', () => {
    const migration = normaliserSql(lireMigration('016_methode_sources.sql'))

    expect(migration).toContain('create table if not exists public.methode_sources')
    expect(migration).toContain('id uuid primary key default gen_random_uuid()')
    expect(migration).toContain(
      'methode_id uuid references public.methodes on delete cascade not null',
    )
    expect(migration).toContain('niveau_precision smallint not null')
    expect(migration).toContain(
      "type_document = 'manuel' and periode_numero is null and niveau_precision = 1",
    )
    expect(migration).toContain(
      "type_document = 'programmation' and periode_numero is null and niveau_precision = 2",
    )
    expect(migration).toContain(
      "type_document = 'periode' and periode_numero is not null and periode_numero between 1 and 5 and niveau_precision = 3",
    )
    expect(migration).toContain("jsonb_typeof(contenu_structure) = 'object'")
    expect(migration).toContain("contenu_structure ? 'semaines'")
    expect(migration).toContain("jsonb_typeof(contenu_structure -> 'semaines') = 'array'")
    expect(migration).toContain("contenu_structure ? 'periodes'")
    expect(migration).toContain("jsonb_typeof(contenu_structure -> 'periodes') = 'array'")
    expect(migration).toContain('empreinte_contenu text not null')
    expect(migration).toContain('created_at timestamptz not null default now()')
    expect(migration).toContain('unique (methode_id, empreinte_contenu)')
    expect(migration).toContain('alter table public.methode_sources enable row level security')
  })

  test('la policy methode_sources est idempotente et limitee a la lecture proprietaire', () => {
    const migration = normaliserSql(lireMigration('016_methode_sources.sql'))
    const debutPolicy = migration.indexOf('create policy "users select own methode sources"')
    const finPolicy = migration.indexOf('exception when duplicate_object then null', debutPolicy)
    const policy = migration.slice(debutPolicy, finPolicy)

    expect(debutPolicy).toBeGreaterThanOrEqual(0)
    expect(finPolicy).toBeGreaterThan(debutPolicy)
    expect(policy).toContain('for select')
    expect(policy).toContain('using (')
    expect(policy).not.toContain('with check (')
    expect(policy).toContain('from public.methodes m')
    expect(policy).toContain('join public.classes c on c.id = m.class_id')
    expect(policy).toContain('c.user_id = auth.uid()')
    expect(migration).not.toMatch(/create policy .* for (insert|update|delete|all)/)
  })

  test('la migration expose deux operations security definer avec snapshot attendu', () => {
    const migration = normaliserSql(lireMigration('016_methode_sources.sql'))

    expect(migration).toContain(
      "create or replace function public.enregistrer_source_progression( p_class_id uuid, p_methode_id uuid, p_matiere text, p_nom_source text, p_type_document text, p_periode_numero integer, p_niveau_precision smallint, p_contenu_structure jsonb, p_empreinte_contenu text, p_lignes jsonb, p_source_ids_attendus uuid[] ) returns uuid language plpgsql security definer set search_path = ''",
    )
    expect(migration).toContain(
      "create or replace function public.retirer_source_progression( p_source_id uuid, p_lignes jsonb, p_source_ids_attendus uuid[] ) returns void language plpgsql security definer set search_path = ''",
    )
    expect(migration).not.toContain('security invoker')
    expect(migration).not.toContain('set search_path = public')
    expect(migration).toContain(
      'revoke all on function public.enregistrer_source_progression(uuid, uuid, text, text, text, integer, smallint, jsonb, text, jsonb, uuid[]) from public',
    )
    expect(migration).toContain(
      'grant execute on function public.enregistrer_source_progression(uuid, uuid, text, text, text, integer, smallint, jsonb, text, jsonb, uuid[]) to authenticated',
    )
    expect(migration).toContain(
      'revoke all on function public.retirer_source_progression(uuid, jsonb, uuid[]) from public',
    )
    expect(migration).toContain(
      'grant execute on function public.retirer_source_progression(uuid, jsonb, uuid[]) to authenticated',
    )
  })

  test('les fonctions verrouillent puis refusent un snapshot obsolete avant le DML', () => {
    const migration = normaliserSql(lireMigration('016_methode_sources.sql'))
    const debutEnregistrement = migration.indexOf(
      'create or replace function public.enregistrer_source_progression',
    )
    const debutRetrait = migration.indexOf(
      'create or replace function public.retirer_source_progression',
    )
    const finRetrait = migration.indexOf(
      'revoke all on function public.enregistrer_source_progression',
    )
    const enregistrement = migration.slice(debutEnregistrement, debutRetrait)
    const retrait = migration.slice(debutRetrait, finRetrait)

    expect(enregistrement).toContain('m.id = p_methode_id')
    expect(enregistrement).toContain('m.class_id = p_class_id')
    expect(enregistrement).toContain('m.matiere = p_matiere')
    expect(enregistrement).toContain('c.user_id = auth.uid()')
    expect(enregistrement).toContain("jsonb_typeof(p_lignes) <> 'array'")
    expect(enregistrement).toContain('pg_advisory_xact_lock')
    expect(enregistrement).toContain('p_source_ids_attendus')
    expect(enregistrement).toContain('array_agg(ms.id order by ms.id)')
    expect(enregistrement).toContain("les documents ont change, recharge puis reessaie")
    expect(enregistrement.indexOf('pg_advisory_xact_lock')).toBeLessThan(
      enregistrement.indexOf('array_agg(ms.id order by ms.id)'),
    )
    expect(enregistrement.indexOf('insert into public.methode_sources')).toBeGreaterThan(
      enregistrement.indexOf("les documents ont change, recharge puis reessaie"),
    )
    expect(enregistrement.indexOf('perform public.remplacer_progression')).toBeGreaterThan(
      enregistrement.indexOf('insert into public.methode_sources'),
    )

    expect(retrait).toContain('ms.id = p_source_id')
    expect(retrait).toContain('c.user_id = auth.uid()')
    expect(retrait).toContain("jsonb_typeof(p_lignes) <> 'array'")
    expect(retrait.indexOf('select m.class_id, m.id, m.matiere')).toBeLessThan(
      retrait.indexOf('pg_advisory_xact_lock'),
    )
    expect(retrait.indexOf('pg_advisory_xact_lock')).toBeLessThan(
      retrait.indexOf('array_agg(ms.id order by ms.id)'),
    )
    expect(retrait.indexOf('delete from public.methode_sources')).toBeGreaterThan(
      retrait.indexOf("les documents ont change, recharge puis reessaie"),
    )
    expect(retrait.indexOf('perform public.remplacer_progression')).toBeGreaterThan(
      retrait.indexOf('delete from public.methode_sources'),
    )
  })

  test('les tables sont qualifiees et les mutations directes sont revoquees', () => {
    const migration = normaliserSql(lireMigration('016_methode_sources.sql'))

    expect(migration).toContain('create table if not exists public.methode_sources')
    expect(migration).toContain('references public.methodes')
    expect(migration).toContain('revoke all on table public.methode_sources from anon, authenticated')
    expect(migration).toContain('grant select on table public.methode_sources to authenticated')
    expect(migration).toContain('perform public.remplacer_progression')
  })

  test('la reconstruction autonome 006 contient les fonctions dans le bon ordre', () => {
    const migration = normaliserSql(lireMigration('006_schema_complet_idempotent.sql'))
    const migration014 = normaliserSql(
      lireMigration('014_remplacement_progression_atomique.sql'),
    )
    const definitionActuelle = migration014.slice(
      migration014.indexOf('create or replace function remplacer_progression'),
    )
    const remplacement = migration.indexOf('create or replace function remplacer_progression')
    const sources = migration.indexOf('create table if not exists public.methode_sources')
    const enregistrement = migration.indexOf(
      'create or replace function public.enregistrer_source_progression',
    )
    const retrait = migration.indexOf('create or replace function public.retirer_source_progression')

    expect(remplacement).toBeGreaterThanOrEqual(0)
    expect(migration).toContain(definitionActuelle)
    expect(sources).toBeGreaterThan(remplacement)
    expect(enregistrement).toBeGreaterThan(sources)
    expect(retrait).toBeGreaterThan(enregistrement)
  })

  test('la reconstruction 006 reproduit exactement le schema et les RPC de 016', () => {
    const sansCommentaires = (sql: string) => normaliserSql(
      sql.replace(/^--.*$/gm, ''),
    )
    const migration006 = sansCommentaires(
      lireMigration('006_schema_complet_idempotent.sql'),
    )
    const migration016 = sansCommentaires(lireMigration('016_methode_sources.sql'))
    const debut006 = migration006.indexOf('create table if not exists public.methode_sources')
    const debut016 = migration016.indexOf('create table if not exists public.methode_sources')

    expect(migration006.slice(debut006)).toBe(migration016.slice(debut016))
  })

  test('aucune action TypeScript ne supprime directement une source importee', () => {
    for (const nom of [
      'progression-ia.ts',
      'progression-matiere.ts',
      'progression-periode.ts',
      'progression-programmation.ts',
    ]) {
      const source = readFileSync(join(process.cwd(), 'src', 'lib', 'actions', nom), 'utf8')
      expect(source).not.toMatch(/from\(['"]methode_sources['"]\)\.delete\(\)/)
    }
  })

  test('MethodeSource relie chaque document a sa periode et sa precision exactes', () => {
    const base: MethodeSourceBase = {
      id: 'source-1',
      methode_id: 'methode-1',
      nom_source: 'Document',
      contenu_structure: { semaines: [], periodes: [] },
      empreinte_contenu: 'empreinte',
      created_at: '2026-07-23T00:00:00Z',
    }
    const sources: MethodeSource[] = [
      { ...base, type_document: 'manuel', periode_numero: null, niveau_precision: 1 },
      { ...base, type_document: 'programmation', periode_numero: null, niveau_precision: 2 },
      { ...base, type_document: 'periode', periode_numero: 5, niveau_precision: 3 },
    ]
    const accepterSource = (_source: MethodeSource) => undefined

    // @ts-expect-error Un manuel ne porte pas de numero de periode.
    accepterSource({ ...base, type_document: 'manuel', periode_numero: 1, niveau_precision: 1 })
    // @ts-expect-error Une programmation utilise toujours la precision 2.
    accepterSource({ ...base, type_document: 'programmation', periode_numero: null, niveau_precision: 3 })
    // @ts-expect-error Une source de periode utilise toujours la precision 3.
    accepterSource({ ...base, type_document: 'periode', periode_numero: 5, niveau_precision: 2 })

    expect(sources.map(source => source.niveau_precision)).toEqual([1, 2, 3])
  })
})
