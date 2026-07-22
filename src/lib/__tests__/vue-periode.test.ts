import { agregerParPeriode } from '../vue-periode'

describe('agregerParPeriode', () => {
  const periodeParSemaine = new Map<number, number | null>([
    [1, 1], [2, 1], [3, 1],
    [4, 2], [5, 2],
  ])

  test('regroupe les notions par periode puis par matiere', () => {
    const res = agregerParPeriode(
      [
        { matiere: 'francais', numero: 1, items: ['a', 'i'] },
        { matiere: 'francais', numero: 2, items: ['o'] },
        { matiere: 'maths', numero: 1, items: ['nombres jusqu a 5'] },
        { matiere: 'francais', numero: 4, items: ['ch'] },
      ],
      periodeParSemaine,
    )
    expect(res).toEqual([
      {
        periode: 1,
        matieres: [
          { matiere: 'francais', notions: ['a', 'i', 'o'] },
          { matiere: 'maths', notions: ['nombres jusqu a 5'] },
        ],
      },
      {
        periode: 2,
        matieres: [{ matiere: 'francais', notions: ['ch'] }],
      },
    ])
  })

  test('deduplique une notion repetee sur plusieurs semaines de la periode', () => {
    const res = agregerParPeriode(
      [
        { matiere: 'maths', numero: 1, items: ['comparer'] },
        { matiere: 'maths', numero: 2, items: ['comparer', 'ranger'] },
      ],
      periodeParSemaine,
    )
    expect(res[0].matieres[0]).toEqual({ matiere: 'maths', notions: ['comparer', 'ranger'] })
  })

  test('place le francais avant les maths, puis les autres matieres', () => {
    const res = agregerParPeriode(
      [
        { matiere: 'eps', numero: 1, items: ['courir'] },
        { matiere: 'maths', numero: 1, items: ['compter'] },
        { matiere: 'francais', numero: 1, items: ['lire'] },
      ],
      periodeParSemaine,
    )
    expect(res[0].matieres.map(m => m.matiere)).toEqual(['francais', 'maths', 'eps'])
  })

  test('une semaine sans periode tombe dans un bloc null', () => {
    const res = agregerParPeriode(
      [{ matiere: 'francais', numero: 99, items: ['hors periode'] }],
      periodeParSemaine,
    )
    expect(res).toEqual([
      { periode: null, matieres: [{ matiere: 'francais', notions: ['hors periode'] }] },
    ])
  })

  test('ignore les items vides', () => {
    const res = agregerParPeriode(
      [{ matiere: 'francais', numero: 1, items: ['', '  ', 'a'] }],
      periodeParSemaine,
    )
    expect(res[0].matieres[0].notions).toEqual(['a'])
  })
})
