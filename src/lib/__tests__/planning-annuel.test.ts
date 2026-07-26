import { construirePlanningAnnuel } from '@/lib/planning-annuel'
import type { Semaine } from '@/types'

function semaine(numero: number): Semaine {
  return {
    id: `s-${numero}`,
    class_id: 'classe-1',
    numero,
    date_debut: `2026-09-${String(Math.min(numero, 28)).padStart(2, '0')}`,
    graphemes: ['ancien contenu à ignorer'],
    edm_theme: '',
    edm_competences: '',
    manuel_pages: null,
    mots_exemple: null,
    note: null,
    periode_numero: numero <= 7 ? 1 : 2,
  }
}

describe('construirePlanningAnnuel', () => {
  test('agrège la progression par semaine et par matière sans mélanger les méthodes', () => {
    const modele = construirePlanningAnnuel(
      [semaine(1), semaine(2)],
      [
        { numero: 1, matiere: 'Français', methode_id: 'm-fr', items: ['Son a'], pages: '4', mots_exemple: [] },
        { numero: 1, matiere: 'francais', methode_id: 'm-fr', items: ['Écriture a'], pages: '5', mots_exemple: [] },
        { numero: 1, matiere: 'Mathématiques', methode_id: 'm-ma', items: ['Comparer'], pages: null, mots_exemple: [] },
      ],
      [
        { id: 'm-fr', matiere: 'francais', manuel: "Les P'tites Poules", suivi_actif: true },
        { id: 'm-ma', matiere: 'maths', manuel: 'Maths en CP', suivi_actif: true },
      ],
    )

    expect(modele).toHaveLength(2)
    expect(modele[0].contenus).toEqual([
      {
        codeMatiere: 'francais',
        libelleMatiere: 'Français',
        nomMethode: "Les P'tites Poules",
        suiviActif: true,
        items: ['Son a', 'Écriture a'],
      },
      {
        codeMatiere: 'maths',
        libelleMatiere: 'Mathématiques',
        nomMethode: 'Maths en CP',
        suiviActif: true,
        items: ['Comparer'],
      },
    ])
    expect(modele[1].contenus).toEqual([])
  })

  test('conserve les 36 semaines du squelette quand aucune méthode n’existe', () => {
    const semaines = Array.from({ length: 36 }, (_, index) => semaine(index + 1))

    const modele = construirePlanningAnnuel(semaines, [], [])

    expect(modele).toHaveLength(36)
    expect(modele.every(item => item.contenus.length === 0)).toBe(true)
    expect(modele[0].graphemes).toEqual(['ancien contenu à ignorer'])
  })

  test('déduplique le même élève avec un alias matière et compte deux élèves distincts', () => {
    const modele = construirePlanningAnnuel(
      [semaine(1)],
      [
        { numero: 1, matiere: 'francais', methode_id: 'm-fr', items: ['Son a', 'Son a', 'Écriture a'] },
        { numero: 1, matiere: 'maths', methode_id: 'm-ma', items: ['Comparer'] },
      ],
      [
        { id: 'm-fr', matiere: 'francais', manuel: 'Lecture CP', suivi_actif: true },
        { id: 'm-ma', matiere: 'maths', manuel: 'Maths CP', suivi_actif: false },
      ],
      [
        { semaine_id: 's-1', eleve_id: 'e-1', matiere: 'Lecture', grapheme: 'Son a' },
        { semaine_id: 's-1', eleve_id: 'e-1', matiere: 'francais', grapheme: 'Son a' },
        { semaine_id: 's-1', eleve_id: 'e-2', matiere: 'francais', grapheme: 'Son a' },
        { semaine_id: 's-1', eleve_id: 'e-3', matiere: 'francais', grapheme: 'son a' },
        { semaine_id: 's-1', eleve_id: 'e-1', matiere: 'francais', grapheme: 'Ancienne notion' },
        { semaine_id: 's-1', eleve_id: 'e-1', matiere: 'maths', grapheme: 'Comparer' },
      ],
      2,
    )

    expect(modele[0].contenus).toEqual([
      expect.objectContaining({
        codeMatiere: 'francais',
        suiviActif: true,
        items: ['Son a', 'Écriture a'],
      }),
      expect.objectContaining({
        codeMatiere: 'maths',
        suiviActif: false,
        items: ['Comparer'],
      }),
    ])
    expect(modele[0].avancement).toEqual({ acquis: 2, total: 4 })
  })

  test('ignore les acquisitions d’une progression remplacée', () => {
    const modele = construirePlanningAnnuel(
      [semaine(1)],
      [
        { numero: 1, matiere: 'francais', methode_id: 'm-fr', items: ['Nouvelle notion'] },
      ],
      [
        { id: 'm-fr', matiere: 'francais', manuel: 'Lecture CP', suivi_actif: true },
      ],
      [
        { semaine_id: 's-1', eleve_id: 'e-1', matiere: 'francais', grapheme: 'Ancienne notion' },
        { semaine_id: 's-1', eleve_id: 'e-1', matiere: 'francais', grapheme: 'Nouvelle notion' },
      ],
      1,
    )

    expect(modele[0].avancement).toEqual({ acquis: 1, total: 1 })
  })

  test('retourne un avancement nul sans item actif même si des acquisitions existent', () => {
    const modele = construirePlanningAnnuel(
      [semaine(1)],
      [
        { numero: 1, matiere: 'francais', methode_id: 'm-fr', items: [] },
        { numero: 1, matiere: 'maths', methode_id: 'm-ma', items: ['Comparer'] },
      ],
      [
        { id: 'm-fr', matiere: 'francais', manuel: 'Lecture CP', suivi_actif: true },
        { id: 'm-ma', matiere: 'maths', manuel: 'Maths CP', suivi_actif: false },
      ],
      [
        { semaine_id: 's-1', eleve_id: 'e-1', matiere: 'maths', grapheme: 'Comparer' },
      ],
      25,
    )

    expect(modele[0].avancement).toEqual({ acquis: 0, total: 0 })
  })

  test('sérialise sans ambiguïté le tuple élève, matière et item', () => {
    const modele = construirePlanningAnnuel(
      [semaine(1)],
      [
        {
          numero: 1,
          matiere: 'francais',
          methode_id: 'm-fr',
          items: ['y', 'francais|y'],
        },
      ],
      [
        { id: 'm-fr', matiere: 'francais', manuel: 'Lecture CP', suivi_actif: true },
      ],
      [
        {
          semaine_id: 's-1',
          eleve_id: 'x|francais',
          matiere: 'francais',
          grapheme: 'y',
        },
        {
          semaine_id: 's-1',
          eleve_id: 'x',
          matiere: 'Lecture',
          grapheme: 'francais|y',
        },
      ],
      2,
    )

    expect(modele[0].avancement).toEqual({ acquis: 2, total: 4 })
  })
})
