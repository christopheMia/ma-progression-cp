type Reponse = { data: unknown; error: unknown }
const mockReponses: Record<string, Reponse> = {}
const mockGestes: { table: string; geste: string; valeur?: unknown; options?: unknown }[] = []
const mockEq: { table: string; args: unknown[] }[] = []
let mockUtilisateur: { id: string } | null = { id: 'prof-1' }

function mockRequete(table: string) {
  const reponse = () => mockReponses[table] ?? { data: null, error: null }
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'order', 'limit']) q[m] = () => q
  q.eq = (...args: unknown[]) => { mockEq.push({ table, args }); return q }
  q.single = async () => reponse()
  q.maybeSingle = async () => reponse()
  for (const geste of ['insert', 'update', 'upsert', 'delete']) {
    q[geste] = (valeur?: unknown, options?: unknown) => { mockGestes.push({ table, geste, valeur, options }); return q }
  }
  q.then = (ok: (v: Reponse) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(reponse()).then(ok, ko)
  return q
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: mockUtilisateur } }) },
    from: (table: string) => mockRequete(table),
  })),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { casesDeMaClasse, enregistrerRegle, supprimerRegle } from '../regles-rangement'

const LIGNE = { id: 'r1', class_id: 'classe', type: 'Chant', type_cle: 'chant', creneau: 'Musique', jour: 'jeudi', origine: 'main' }

beforeEach(() => {
  for (const k of Object.keys(mockReponses)) delete mockReponses[k]
  mockGestes.length = 0
  mockEq.length = 0
  mockUtilisateur = { id: 'prof-1' }
  mockReponses.classes = { data: { id: 'classe' }, error: null }
  mockReponses.emploi_du_temps = {
    data: [{ jour: 'jeudi', matiere: 'Musique', type: 'cours', visible_journal: true }], error: null,
  }
  mockReponses.regles_rangement = { data: LIGNE, error: null }
})

describe('actions du carnet de rangement', () => {
  it('les cases de la classe', async () => {
    expect(await casesDeMaClasse()).toEqual({ ok: true, valeur: [{ nom: 'Musique', jours: ['jeudi'] }] })
  })

  it('une règle neuve s’enregistre par type, avec la clé calculée côté serveur', async () => {
    const r = await enregistrerRegle({ type: 'Chant', creneau: 'musique', jour: 'jeudi' })
    expect(r).toEqual({ ok: true, valeur: LIGNE })
    expect(mockGestes).toEqual([{
      table: 'regles_rangement', geste: 'upsert',
      valeur: expect.objectContaining({ class_id: 'classe', type: 'Chant', type_cle: 'chant', creneau: 'Musique', jour: 'jeudi', origine: 'main' }),
      options: { onConflict: 'class_id,type_cle' },
    }])
  })

  it('une règle refusée n’écrit rien', async () => {
    const r = await enregistrerRegle({ type: 'Chant', creneau: 'Chorale', jour: null })
    expect(r).toEqual({ ok: false, message: 'Je ne trouve pas de case « Chorale » dans ton emploi du temps.' })
    expect(mockGestes).toEqual([])
  })

  it('modifier une règle passe par son identifiant', async () => {
    await enregistrerRegle({ id: 'r1', type: 'Chant', creneau: 'Musique', jour: null })
    expect(mockGestes[0]).toMatchObject({ table: 'regles_rangement', geste: 'update' })
    // La règle visée doit être de LA classe lue côté serveur, pas d'une autre.
    const filtres = mockEq.filter(e => e.table === 'regles_rangement').map(e => e.args)
    expect(filtres).toEqual(expect.arrayContaining([['id', 'r1'], ['class_id', 'classe']]))
  })

  it('deux règles pour un même type : un message clair', async () => {
    mockReponses.regles_rangement = { data: null, error: { code: '23505' } }
    const r = await enregistrerRegle({ id: 'r1', type: 'Chant', creneau: 'Musique', jour: null })
    expect(r).toEqual({ ok: false, message: 'Tu as déjà une règle pour « Chant ». Modifie celle-là.' })
  })

  it('supprimer', async () => {
    mockReponses.regles_rangement = { data: null, error: null }
    expect(await supprimerRegle('r1')).toEqual({ ok: true, valeur: undefined })
    expect(mockGestes[0]).toMatchObject({ table: 'regles_rangement', geste: 'delete' })
    const filtres = mockEq.filter(e => e.table === 'regles_rangement').map(e => e.args)
    expect(filtres).toEqual(expect.arrayContaining([['id', 'r1'], ['class_id', 'classe']]))
  })

  it("table absente : un message clair, sans lever", async () => {
    mockReponses.regles_rangement = { data: null, error: { code: "42P01", message: "relation \"regles_rangement\" does not exist" } }
    const r = await enregistrerRegle({ type: "Chant", creneau: "Musique", jour: null })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.message).toMatch(/pas encore prêt/)
    const s = await supprimerRegle("r1")
    expect(s.ok).toBe(false)
    expect(s.ok === false && s.message).toMatch(/pas encore prêt/)
  })

  it('23505 sur le chemin « règle neuve » (upsert) : le même message clair', async () => {
    mockReponses.regles_rangement = { data: null, error: { code: '23505' } }
    const r = await enregistrerRegle({ type: 'Chant', creneau: 'Musique', jour: null })
    expect(r).toEqual({ ok: false, message: 'Tu as déjà une règle pour « Chant ». Modifie celle-là.' })
    expect(mockGestes[0]).toMatchObject({ geste: 'upsert' })
  })

  it('pas connectée : un message, aucune écriture', async () => {
    mockUtilisateur = null
    const r = await enregistrerRegle({ type: 'Chant', creneau: 'Musique', jour: null })
    expect(r).toEqual({ ok: false, message: 'Tu dois être connectée pour modifier ton rangement.' })
    expect(await supprimerRegle('r1')).toEqual({ ok: false, message: 'Tu dois être connectée pour modifier ton rangement.' })
    expect(mockGestes).toEqual([])
  })

  it('classe introuvable : un message, aucune écriture', async () => {
    mockReponses.classes = { data: null, error: null }
    const r = await enregistrerRegle({ type: 'Chant', creneau: 'Musique', jour: null })
    expect(r).toEqual({ ok: false, message: 'Ta classe est introuvable.' })
    expect(mockGestes).toEqual([])
  })

  it('données mal formées venues du navigateur : un message français, jamais un TypeError', async () => {
    const mauvaises = [
      { type: 42, creneau: 'Musique', jour: null },
      { type: 'Chant', creneau: undefined, jour: null },
      { type: 'Chant', creneau: 'Musique', jour: 'dimanche' },
      { type: 'Chant', creneau: 'Musique', jour: undefined },
      { id: 7, type: 'Chant', creneau: 'Musique', jour: null },
    ]
    for (const m of mauvaises) {
      const r = await enregistrerRegle(m as never)
      expect(r.ok).toBe(false)
      expect(r.ok === false && r.message).toMatch(/pas complète/)
    }
    expect(await enregistrerRegle(undefined as never)).toMatchObject({ ok: false })
    expect(mockGestes).toEqual([])
  })

  it('l’origine ne prend que trois valeurs', async () => {
    await enregistrerRegle({ type: 'Chant', creneau: 'Musique', jour: null, origine: 'ia' })
    await enregistrerRegle({ type: 'Chant', creneau: 'Musique', jour: null, origine: 'pirate' as never })
    expect(mockGestes.map(g => (g.valeur as { origine: string }).origine)).toEqual(['ia', 'main'])
  })
})
