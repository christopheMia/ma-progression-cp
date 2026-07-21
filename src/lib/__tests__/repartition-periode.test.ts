import {
  aplatirDomaines,
  repartirSurSemaines,
  repartirProgrammation,
  type PeriodeProgrammation,
} from '../repartition-periode'

describe('aplatirDomaines', () => {
  test('prefixe chaque item par son domaine, dans l\'ordre', () => {
    expect(aplatirDomaines([
      { nom: 'Nombres entiers', items: ['Nombres jusqu\'à 10', 'Nombres ordinaux'] },
      { nom: 'Calcul mental', items: ['Décomposer 4 et 5'] },
    ])).toEqual([
      'Nombres entiers : Nombres jusqu\'à 10',
      'Nombres entiers : Nombres ordinaux',
      'Calcul mental : Décomposer 4 et 5',
    ])
  })

  test('ignore les items vides sans casser la liste', () => {
    expect(aplatirDomaines([{ nom: 'Calcul mental', items: ['Doubles', '  ', ''] }]))
      .toEqual(['Calcul mental : Doubles'])
  })

  test('un domaine sans nom ne produit pas de préfixe orphelin', () => {
    expect(aplatirDomaines([{ nom: '', items: ['Révisions'] }])).toEqual(['Révisions'])
  })
})

describe('repartirSurSemaines', () => {
  test('répartit également quand ça tombe juste', () => {
    const r = repartirSurSemaines(['a', 'b', 'c', 'd'], [1, 2])
    expect(r).toEqual([
      { numero: 1, items: ['a', 'b'] },
      { numero: 2, items: ['c', 'd'] },
    ])
  })

  test('le reste va aux premières semaines', () => {
    // 7 items sur 3 semaines : 3 + 2 + 2, jamais 2 + 2 + 3.
    const r = repartirSurSemaines(['a', 'b', 'c', 'd', 'e', 'f', 'g'], [1, 2, 3])
    expect(r.map(x => x.items.length)).toEqual([3, 2, 2])
  })

  test('l\'ordre du document est preserve d\'un bout a l\'autre', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const r = repartirSurSemaines(items, [4, 5, 6])
    expect(r.flatMap(x => x.items)).toEqual(items)
  })

  test('aucune semaine n\'est perdue ni inventee', () => {
    const r = repartirSurSemaines(['a', 'b', 'c'], [8, 9, 10, 11])
    expect(r.map(x => x.numero)).toEqual([8, 9, 10, 11])
  })

  test('moins d\'items que de semaines : les dernieres restent vides', () => {
    // Mieux vaut un trou visible qu'un contenu recopie ou invente.
    const r = repartirSurSemaines(['a', 'b'], [1, 2, 3, 4])
    expect(r.map(x => x.items)).toEqual([['a'], ['b'], [], []])
  })

  test('aucun item : chaque semaine existe mais reste vide', () => {
    expect(repartirSurSemaines([], [1, 2])).toEqual([
      { numero: 1, items: [] },
      { numero: 2, items: [] },
    ])
  })

  test('aucune semaine : rien a repartir', () => {
    expect(repartirSurSemaines(['a'], [])).toEqual([])
  })
})

describe('repartirProgrammation', () => {
  /** Cas reel : "Maths en CP" (Acces), programmation annuelle par periode. */
  const MATHS_P1: PeriodeProgrammation = {
    numero: 1,
    domaines: [
      { nom: 'Nombres entiers', items: ['Nombres entiers jusqu\'à 10', 'Nombres ordinaux', 'Groupements par 5 et par 10'] },
      { nom: 'Calcul mental', items: ['Décomposer 4 et 5', 'Tables d\'addition', 'Ajouter ou soustraire 2'] },
    ],
  }

  test('utilise les VRAIES semaines de la periode, pas un nombre fixe', () => {
    // La periode 1 de cette classe fait 8 semaines, pas 7.
    const { semaines } = repartirProgrammation(
      [MATHS_P1],
      new Map([[1, [1, 2, 3, 4, 5, 6, 7, 8]]]),
    )
    expect(semaines.map(s => s.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    // 6 items sur 8 semaines : les deux dernieres restent vides.
    expect(semaines.filter(s => s.items.length).length).toBe(6)
  })

  test('chaque item du document se retrouve exactement une fois', () => {
    const { semaines } = repartirProgrammation([MATHS_P1], new Map([[1, [1, 2, 3]]]))
    const tous = semaines.flatMap(s => s.items)
    expect(tous).toHaveLength(6)
    expect(new Set(tous).size).toBe(6)
    expect(tous[0]).toBe('Nombres entiers : Nombres entiers jusqu\'à 10')
  })

  test('une periode absente de la classe est signalee, pas ecrite au hasard', () => {
    const { semaines, periodesIgnorees } = repartirProgrammation(
      [MATHS_P1, { numero: 5, domaines: [{ nom: 'Calcul mental', items: ['Moitié'] }] }],
      new Map([[1, [1, 2]]]), // la classe n'a pas de periode 5 calee
    )
    expect(periodesIgnorees).toEqual([5])
    expect(semaines.every(s => s.numero <= 2)).toBe(true)
  })

  test('les semaines sortent triees, meme si les periodes arrivent en desordre', () => {
    const { semaines } = repartirProgrammation(
      [
        { numero: 2, domaines: [{ nom: 'D', items: ['x'] }] },
        { numero: 1, domaines: [{ nom: 'D', items: ['y'] }] },
      ],
      new Map([[1, [1]], [2, [9]]]),
    )
    expect(semaines.map(s => s.numero)).toEqual([1, 9])
  })

  test('une periode sans aucun item ne cree aucune ligne', () => {
    const { semaines } = repartirProgrammation(
      [{ numero: 1, domaines: [{ nom: 'Vide', items: [] }] }],
      new Map([[1, [1, 2]]]),
    )
    expect(semaines).toEqual([])
  })
})
