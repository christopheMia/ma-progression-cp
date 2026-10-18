import { genererCahierJournal } from '@/lib/cahier-journal'
import type { CreneauHoraire, ProgressionMatiere } from '@/types'

type Reponse = { data: unknown; error: unknown }
const mockReponses: Record<string, Reponse> = {}
const mockEcritures: { table: string; geste: string }[] = []
const mockOrdres: { table: string; colonne: unknown; options: unknown }[] = []

function mockRequete(table: string) {
  const reponse = () => mockReponses[table] ?? { data: null, error: null }
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'limit']) q[m] = () => q
  q.order = (colonne: unknown, options: unknown) => { mockOrdres.push({ table, colonne, options }); return q }
  q.single = async () => reponse()
  q.maybeSingle = async () => reponse()
  q.insert = async () => { mockEcritures.push({ table, geste: 'insert' }); return { error: null } }
  q.upsert = async () => { mockEcritures.push({ table, geste: 'upsert' }); return { error: null } }
  q.then = (ok: (v: Reponse) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(reponse()).then(ok, ko)
  return q
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'prof-1' } } }) },
    from: (table: string) => mockRequete(table),
  })),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { genererOuChargerJournal, regenererJournal } from '../journal'

const creneau = (jour: CreneauHoraire['jour'], matiere: string): CreneauHoraire => ({
  id: `${jour}-${matiere}`, class_id: 'classe', jour, heure_debut: '08:00', heure_fin: '08:30',
  matiere, ordre: 1, couleur: null, type: 'cours', methode_id: null, visible_journal: true,
})
const EDT = [creneau('lundi', 'Mathématiques'), creneau('jeudi', 'Musique')]
const PROGRESSION: ProgressionMatiere[] = [
  { methode_id: null, matiere: 'arts', items: ['Chant : L’Europe'], pages: null, mots_exemple: [] },
]

beforeEach(() => {
  for (const k of Object.keys(mockReponses)) delete mockReponses[k]
  mockEcritures.length = 0
  mockOrdres.length = 0
  jest.restoreAllMocks()
  mockReponses.semaines = { data: { id: 's1', class_id: 'classe', numero: 3 }, error: null }
  mockReponses.cahier_journal = { data: null, error: null }
  mockReponses.emploi_du_temps = { data: EDT, error: null }
  mockReponses.progression = { data: PROGRESSION, error: null }
})

describe('le cahier journal et le carnet de rangement', () => {
  it('carnet illisible (migration pas encore passée) : le cahier d’aujourd’hui, sans erreur', async () => {
    mockReponses.regles_rangement = { data: null, error: { message: 'relation "regles_rangement" does not exist' } }
    const r = await genererOuChargerJournal('s1')
    expect(r).toEqual({ ok: true, valeur: genererCahierJournal(EDT, PROGRESSION, PROGRESSION) })
    expect(mockEcritures).toEqual([{ table: 'cahier_journal', geste: 'insert' }])
  })

  it('les règles du carnet sont appliquées à la fabrication', async () => {
    mockReponses.regles_rangement = { data: [{ type: 'Chant', creneau: 'Musique', jour: null }], error: null }
    const r = await genererOuChargerJournal('s1')
    if (!r.ok) throw new Error(r.message)
    const jeudi = r.valeur.find(j => j.jour === 'jeudi')!
    expect(jeudi.seances.find(s => s.matiere === 'Musique')!.deroulement).toBe('Chant : L’Europe')
  })

  it('régénérer applique aussi le carnet', async () => {
    mockReponses.regles_rangement = { data: [{ type: 'Chant', creneau: 'Musique', jour: null }], error: null }
    const r = await regenererJournal('s1')
    if (!r.ok) throw new Error(r.message)
    expect(r.valeur.find(j => j.jour === 'jeudi')!.seances[0].deroulement).toBe('Chant : L’Europe')
    expect(mockEcritures).toEqual([{ table: 'cahier_journal', geste: 'upsert' }])
  })

  it('les règles sont lues de la plus récemment modifiée à la plus ancienne (la première l’emporte)', async () => {
    mockReponses.regles_rangement = { data: [], error: null }
    await genererOuChargerJournal('s1')
    expect(mockOrdres).toContainEqual({ table: 'regles_rangement', colonne: 'updated_at', options: { ascending: false } })
  })

  it('une vraie panne de lecture du carnet est signalée dans les journaux, sans bloquer le cahier', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockReponses.regles_rangement = { data: null, error: { code: '57014', message: 'canceling statement due to timeout' } }
    const r = await genererOuChargerJournal('s1')
    expect(r).toEqual({ ok: true, valeur: genererCahierJournal(EDT, PROGRESSION, PROGRESSION) })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0].join(' '))).toContain('57014')
    expect(String(warn.mock.calls[0].join(' '))).toContain('canceling statement due to timeout')
  })

  it.each([
    [{ code: 'PGRST205', message: 'Could not find the table in the schema cache' }],
    [{ code: '42P01', message: 'x' }],
    [{ message: 'relation "regles_rangement" does not exist' }],
  ])('table absente (%j) : aucun avertissement', async (erreur) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockReponses.regles_rangement = { data: null, error: erreur }
    await genererOuChargerJournal('s1')
    expect(warn).not.toHaveBeenCalled()
  })
})
