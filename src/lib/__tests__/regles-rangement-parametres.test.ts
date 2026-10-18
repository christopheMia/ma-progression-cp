import {
  casesDisponibles, estRegleSansCase, etatCaseRegle, regrouperRegles, preparerRegle, lireReglesCompletes,
} from '../regles-rangement'
import type { CreneauHoraire, RegleRangement } from '@/types'

type Ligne = Pick<CreneauHoraire, 'jour' | 'matiere' | 'type' | 'visible_journal'>
const l = (jour: CreneauHoraire['jour'], matiere: string, type: 'cours' | 'routine' = 'cours', visible_journal = true): Ligne =>
  ({ jour, matiere, type, visible_journal })
const EDT: Ligne[] = [
  l('lundi', 'Mathématiques'), l('jeudi', 'mathématiques'), l('jeudi', 'Musique'),
  l('lundi', 'Récréation', 'routine'), l('mardi', 'Rituel : je découvre une œuvre', 'cours', false),
  l('vendredi', 'APC'),
]
const regle = (id: string, type: string, creneau: string, jour: CreneauHoraire['jour'] | null = null): RegleRangement =>
  ({ id, class_id: 'classe', type, type_cle: type.toLowerCase(), creneau, jour, origine: 'main' })

describe('casesDisponibles', () => {
  it('seulement les cases de cours visibles, une fois par nom, avec leurs jours', () => {
    expect(casesDisponibles(EDT)).toEqual([
      { nom: 'APC', jours: ['vendredi'] },
      { nom: 'Mathématiques', jours: ['lundi', 'jeudi'] },
      { nom: 'Musique', jours: ['jeudi'] },
    ])
  })
})

describe('estRegleSansCase', () => {
  const cases = casesDisponibles(EDT)
  it('une case renommée ou supprimée est signalée', () => {
    expect(estRegleSansCase(regle('1', 'Chant', 'Éveil musical'), cases)).toBe(true)
  })
  it('une case qui n’existe pas le jour préféré est signalée', () => {
    expect(estRegleSansCase(regle('1', 'Chant', 'Musique', 'lundi'), cases)).toBe(true)
  })
  it('une règle juste ne l’est pas', () => {
    expect(estRegleSansCase(regle('1', 'Chant', 'musique', 'jeudi'), cases)).toBe(false)
  })
})

describe('etatCaseRegle', () => {
  const cases = casesDisponibles(EDT)
  it('distingue case absente, case d’un autre jour, et case juste', () => {
    expect(etatCaseRegle(regle('1', 'Chant', 'Éveil musical'), cases)).toBe('absente')
    expect(etatCaseRegle(regle('1', 'Chant', 'Musique', 'lundi'), cases)).toBe('autre-jour')
    expect(etatCaseRegle(regle('1', 'Chant', 'musique', 'jeudi'), cases)).toBe('ok')
    expect(etatCaseRegle(regle('1', 'Chant', 'Musique'), cases)).toBe('ok')
  })
})

describe('regrouperRegles', () => {
  it('les types qui vont dans la même case, le même jour, sur une ligne', () => {
    const groupes = regrouperRegles([
      regle('1', 'Chant', 'Musique', 'jeudi'), regle('2', 'Fluence', 'APC'),
      regle('3', 'Écoute musicale', 'musique', 'jeudi'),
    ])
    expect(groupes.map(g => [g.creneau, g.jour, g.regles.map(r => r.type)])).toEqual([
      ['APC', null, ['Fluence']],
      ['Musique', 'jeudi', ['Chant', 'Écoute musicale']],
    ])
  })
})

describe('preparerRegle', () => {
  const cases = casesDisponibles(EDT)
  it('reprend l’écriture de la case telle qu’elle est dans l’emploi du temps', () => {
    expect(preparerRegle({ type: ' Chant ', creneau: 'musique', jour: 'jeudi' }, cases)).toEqual({
      ok: true, valeur: { type: 'Chant', type_cle: 'chant', creneau: 'Musique', jour: 'jeudi' },
    })
  })
  it('refuse une case absente, avec un message pour elle', () => {
    expect(preparerRegle({ type: 'Chant', creneau: 'Chorale', jour: null }, cases))
      .toEqual({ ok: false, message: 'Je ne trouve pas de case « Chorale » dans ton emploi du temps.' })
  })
  it('refuse un jour où la case n’existe pas', () => {
    expect(preparerRegle({ type: 'Chant', creneau: 'Musique', jour: 'lundi' }, cases))
      .toEqual({ ok: false, message: 'Ta case « Musique » n’existe pas le lundi.' })
  })
  it('refuse un type vide, une routine, une case cachée', () => {
    expect(preparerRegle({ type: '  ', creneau: 'Musique', jour: null }, cases).ok).toBe(false)
    expect(preparerRegle({ type: 'Jeu', creneau: 'Récréation', jour: null }, cases).ok).toBe(false)
    expect(preparerRegle({ type: 'Art', creneau: 'Rituel : je découvre une œuvre', jour: null }, cases).ok).toBe(false)
  })
})

describe('lireReglesCompletes', () => {
  it('lit les lignes de la base et écarte les incomplètes', () => {
    expect(lireReglesCompletes([
      { id: '1', class_id: 'c', type: 'Chant', type_cle: 'chant', creneau: 'Musique', jour: 'jeudi', origine: 'ia' },
      { id: '2', class_id: 'c', type: 'Fluence', type_cle: 'fluence', creneau: 'APC', jour: 'dimanche', origine: '?' },
      { id: 3, class_id: 'c', type: 'X', type_cle: 'x', creneau: 'APC' },
    ])).toEqual([
      { id: '1', class_id: 'c', type: 'Chant', type_cle: 'chant', creneau: 'Musique', jour: 'jeudi', origine: 'ia' },
      { id: '2', class_id: 'c', type: 'Fluence', type_cle: 'fluence', creneau: 'APC', jour: null, origine: 'main' },
    ])
  })
})
