import {
  analyserAjoutSource,
  calculerEmpreinteSource,
  cleMethode,
  estSourceProgressionValide,
  materialiserSources,
  niveauPrecision,
  regrouperSources,
  type SourceProgressionManuel,
  type SourceProgressionPeriode,
  type SourceProgressionProgrammation,
} from '../progression-sources'

const source = (overrides: Partial<SourceProgressionManuel> = {}): SourceProgressionManuel => ({
  clientId: 'source-1',
  creeLe: '2026-07-23T08:00:00.000Z',
  nomSource: 'Document de progression.pdf',
  matiere: 'Francais',
  nomMethode: "Les P'tites Poules",
  typeDocument: 'manuel',
  periodeNumero: null,
  semaines: [],
  periodes: [],
  empreinteContenu: 'empreinte-1',
  ...overrides,
})

describe('materialiserSources', () => {
  test('regroupe les blocs de programmation de la meme periode sans perdre de notion', () => {
    const resultat = materialiserSources([
      sourceProgrammation({
        periodes: [
          { numero: 1, domaines: [{ nom: 'Nombres', items: ['Compter'] }] },
          { numero: 1, domaines: [{ nom: 'Calcul', items: ['Ajouter'] }] },
        ],
      }),
    ], new Map([[1, [4, 5]]]))

    expect(resultat.semaines.flatMap(semaine => semaine.items)).toEqual([
      'Nombres : Compter',
      'Calcul : Ajouter',
    ])
    expect(resultat.avertissements.join(' ')).toContain('P1')
  })

  test.each([0, 37])('une semaine locale de periode %i hors plage est ignoree sans decaler les suivantes', (numeroInvalide) => {
    const resultat = materialiserSources([
      sourcePeriode({
        periodeNumero: 1,
        semaines: [
          { numero: numeroInvalide, items: ['invalide'], pages: '', mots_exemple: [] },
          { numero: 2, items: ['reste seconde'], pages: '', mots_exemple: [] },
        ],
      }),
    ], new Map([[1, [4, 5]]]))

    expect(resultat.semaines).toEqual([
      { numero: 5, items: ['reste seconde'], pages: '', mots_exemple: [] },
    ])
    expect(resultat.semaines.map(semaine => semaine.numero)).not.toContain(4)
    expect(resultat.avertissements.join(' ')).toContain(String(numeroInvalide))
  })

  test('une periode detaillee remplace uniquement P1 et conserve le sommaire P2', () => {
    const resultat = materialiserSources([
      source({
        semaines: [
          { numero: 4, items: ['sommaire P1'], pages: '', mots_exemple: [] },
          { numero: 2, items: ['sommaire P2'], pages: '', mots_exemple: [] },
        ],
      }),
      sourcePeriode({
        clientId: 'p1-detaillee',
        periodeNumero: 1,
        semaines: [{ numero: 1, items: ['detail P1'], pages: 'p. 4', mots_exemple: [] }],
      }),
    ], new Map([[1, [4]], [2, [2]]]))

    expect(resultat.semaines).toEqual([
      { numero: 2, items: ['sommaire P2'], pages: '', mots_exemple: [] },
      { numero: 4, items: ['detail P1'], pages: 'p. 4', mots_exemple: [] },
    ])
    expect(resultat.remplacements).toEqual([
      { numero: 4, ancienneSource: 'source-1', nouvelleSource: 'p1-detaillee' },
    ])
  })

  test('une programmation utilise les vraies semaines et chaque item une seule fois', () => {
    const resultat = materialiserSources([
      sourceProgrammation({
        periodes: [{
          numero: 1,
          domaines: [{ nom: 'Calcul', items: ['Compter', 'Ajouter', 'Comparer'] }],
        }],
      }),
    ], new Map([[1, [4, 5, 6]]]))

    expect(resultat.semaines.map(semaine => semaine.numero)).toEqual([4, 5, 6])
    expect(resultat.semaines.flatMap(semaine => semaine.items)).toEqual([
      'Calcul : Compter',
      'Calcul : Ajouter',
      'Calcul : Comparer',
    ])
  })

  test('les semaines vides d une programmation n effacent pas le sommaire', () => {
    const resultat = materialiserSources([
      source({
        semaines: [
          { numero: 1, items: ['sommaire 1'], pages: '', mots_exemple: [] },
          { numero: 2, items: ['sommaire 2'], pages: '', mots_exemple: [] },
        ],
      }),
      sourceProgrammation({
        periodes: [{ numero: 1, domaines: [{ nom: 'Calcul', items: ['Compter'] }] }],
      }),
    ], new Map([[1, [1, 2]]]))

    expect(resultat.semaines).toEqual([
      { numero: 1, items: ['Calcul : Compter'], pages: '', mots_exemple: [] },
      { numero: 2, items: ['sommaire 2'], pages: '', mots_exemple: [] },
    ])
  })

  test('la source au creeLe le plus recent gagne a precision egale, meme en ordre inverse', () => {
    const resultat = materialiserSources([
      Object.assign(source({ clientId: 'recente', semaines: [{ numero: 1, items: ['recente'], pages: '', mots_exemple: [] }] }), { creeLe: '2026-07-23T10:00:00.000Z' }),
      Object.assign(source({ clientId: 'ancienne', semaines: [{ numero: 1, items: ['ancienne'], pages: '', mots_exemple: [] }] }), { creeLe: '2026-07-23T09:00:00.000Z' }),
    ], new Map())

    expect(resultat.semaines).toEqual([
      { numero: 1, items: ['recente'], pages: '', mots_exemple: [] },
    ])
    expect(resultat.remplacements).toEqual([
      { numero: 1, ancienneSource: 'ancienne', nouvelleSource: 'recente' },
    ])
  })

  test('departage une meme date de maniere deterministe avec clientId', () => {
    const resultat = materialiserSources([
      Object.assign(source({ clientId: 'z-source', semaines: [{ numero: 1, items: ['z'], pages: '', mots_exemple: [] }] }), { creeLe: '2026-07-23T10:00:00.000Z' }),
      Object.assign(source({ clientId: 'a-source', semaines: [{ numero: 1, items: ['a'], pages: '', mots_exemple: [] }] }), { creeLe: '2026-07-23T10:00:00.000Z' }),
    ], new Map())

    expect(resultat.semaines[0].items).toEqual(['z'])
  })

  test('un planning de periode trop long est coupe sans ecrire P2 et avertit', () => {
    const resultat = materialiserSources([
      sourcePeriode({
        periodeNumero: 1,
        semaines: [
          { numero: 1, items: ['P1.1'], pages: '', mots_exemple: [] },
          { numero: 2, items: ['P1.2'], pages: '', mots_exemple: [] },
          { numero: 3, items: ['ne doit pas aller en P2'], pages: '', mots_exemple: [] },
        ],
      }),
    ], new Map([[1, [3, 4]], [2, [5, 6]]]))

    expect(resultat.semaines.map(semaine => semaine.numero)).toEqual([3, 4])
    expect(resultat.semaines.flatMap(semaine => semaine.items)).not.toContain('ne doit pas aller en P2')
    expect(resultat.avertissements.join(' ')).toContain('période 1')
  })

  test('une periode absente est avertie sans produire de ligne', () => {
    const resultat = materialiserSources([
      sourcePeriode({ periodeNumero: 3, semaines: [{ numero: 1, items: ['absent'], pages: '', mots_exemple: [] }] }),
    ], new Map([[1, [1]]]))

    expect(resultat.semaines).toEqual([])
    expect(resultat.avertissements.join(' ')).toContain('période 3')
  })

  test('trie les sorties et ne mute ni les sources ni la map des semaines', () => {
    const sources = [
      source({
        semaines: [
          { numero: 4, items: ['quatre'], pages: '', mots_exemple: [] },
          { numero: 2, items: ['deux'], pages: '', mots_exemple: [] },
          { numero: 37, items: ['hors plage'], pages: '', mots_exemple: [] },
        ],
      }),
      sourceProgrammation({
        periodes: [{ numero: 1, domaines: [{ nom: 'Calcul', items: ['compter'] }] }],
      }),
    ]
    const semainePeriode = [5, 4]
    const calendrier = new Map([[1, semainePeriode]])
    const sourcesAvant = structuredClone(sources)

    const resultat = materialiserSources(sources, calendrier)

    expect(resultat.semaines.map(semaine => semaine.numero)).toEqual([2, 4])
    expect(resultat.avertissements.join(' ')).toContain('37')
    expect(sources).toEqual(sourcesAvant)
    expect(calendrier.get(1)).toEqual([5, 4])
  })
})

const sourcePeriode = (overrides: Partial<SourceProgressionPeriode> = {}): SourceProgressionPeriode => ({
  ...source(),
  clientId: 'periode-2',
  nomSource: 'Periode 2.pdf',
  typeDocument: 'periode',
  periodeNumero: 2,
  ...overrides,
})

const sourceProgrammation = (
  overrides: Partial<SourceProgressionProgrammation> = {},
): SourceProgressionProgrammation => ({
  ...source(),
  typeDocument: 'programmation',
  ...overrides,
})

describe('progression-sources', () => {
  test('normalise les accents, la casse et les espaces dans la cle de methode', () => {
    expect(cleMethode(source({ matiere: 'Français', nomMethode: "P'tites Poules" }))).toBe(cleMethode(source({
      matiere: ' francais ',
      nomMethode: "P'TITES   POULES",
    })))
  })

  test('rapproche les apostrophes typographiques, ligatures et tirets Unicode', () => {
    expect(cleMethode(source({ nomMethode: "P'tites Poules" }))).toBe(cleMethode(source({
      nomMethode: 'P’tites Poules',
    })))
    expect(cleMethode(source({ nomMethode: 'Œufs – CP' }))).toBe(cleMethode(source({
      nomMethode: 'oeufs-cp',
    })))
  })

  test('ordonne les precisions de la periode au manuel', () => {
    expect(niveauPrecision('periode')).toBeGreaterThan(niveauPrecision('programmation'))
    expect(niveauPrecision('programmation')).toBeGreaterThan(niveauPrecision('manuel'))
  })

  test('regroupe deux documents de la meme methode en conservant leur ordre', () => {
    const premier = source({ clientId: 'manuel', nomSource: 'Sommaire.pdf' })
    const second = sourcePeriode()

    const groupes = regrouperSources([premier, second])

    expect(groupes).toHaveLength(1)
    expect(groupes[0]).toMatchObject({
      matiere: 'Francais',
      nomMethode: "Les P'tites Poules",
      suiviActif: true,
    })
    expect(groupes[0].sources).toEqual([premier, second])
  })

  test('separe les sources de deux matieres', () => {
    const groupes = regrouperSources([
      source(),
      source({ clientId: 'maths', matiere: 'Maths', nomMethode: 'Maths en CP' }),
    ])

    expect(groupes).toHaveLength(2)
    expect(groupes.map(groupe => groupe.matiere)).toEqual(['Francais', 'Maths'])
  })

  test('bloque un doublon de contenu exact', () => {
    const analyse = analyserAjoutSource([source()], source({ clientId: 'copie' }))

    expect(analyse).toMatchObject({ doublon: true, autorisable: false, periodesRemplacees: [] })
  })

  test('annonce le remplacement de la periode 2 apres une programmation annuelle', () => {
    const analyse = analyserAjoutSource(
      [sourceProgrammation({ empreinteContenu: 'annuelle' })],
      sourcePeriode({ empreinteContenu: 'periode-2' }),
    )

    expect(analyse).toMatchObject({
      doublon: false,
      autorisable: true,
      periodesRemplacees: [2],
    })
    expect(analyse.message).toContain('période 2')
  })

  test('calcule une empreinte SHA-256 sans les champs locaux ni le nom affiche', async () => {
    const a = await calculerEmpreinteSource(source({ clientId: 'a', empreinteContenu: 'ancienne' }))
    const b = await calculerEmpreinteSource(source({
      clientId: 'b',
      empreinteContenu: 'autre',
      nomSource: 'Copie avec un autre nom.pdf',
    }))

    expect(a).toMatch(/^[a-f0-9]{64}$/)
    expect(a).toBe(b)
  })

  test('garde la meme empreinte quand creeLe change', async () => {
    const a = await calculerEmpreinteSource(Object.assign(source(), { creeLe: '2026-07-23T09:00:00.000Z' }))
    const b = await calculerEmpreinteSource(Object.assign(source(), { creeLe: '2026-07-23T10:00:00.000Z' }))

    expect(a).toBe(b)
  })

  test('ignore la matiere et le nom de methode car l unicite est portee par methode_id', async () => {
    const a = await calculerEmpreinteSource(source({
      matiere: 'Français',
      nomMethode: 'Méthode Éclair',
    }))
    const b = await calculerEmpreinteSource(source({
      matiere: 'MATHEMATIQUES',
      nomMethode: 'methode eclair',
    }))

    expect(a).toBe(b)
  })

  test('normalise le texte et ignore les squelettes pedagogiques vides', async () => {
    const a = await calculerEmpreinteSource(source({
      semaines: [{
        numero: 1,
        items: ['  nume\u0301ros   jusqu’à 10  ', '   '],
        pages: '',
        mots_exemple: [],
      }, {
        numero: 2,
        items: [''],
        pages: ' ',
        mots_exemple: [' '],
      }],
    }))
    const b = await calculerEmpreinteSource(source({
      semaines: [{
        numero: 1,
        items: ['numéros jusqu’à 10'],
        pages: '',
        mots_exemple: [],
      }],
    }))

    expect(a).toBe(b)
  })

  test('conserve les pages et mots valides meme sans item', async () => {
    const pagesA = await calculerEmpreinteSource(source({
      semaines: [{
        numero: 1,
        items: [],
        pages: 'p. 10',
        mots_exemple: [],
      }],
    }))
    const pagesB = await calculerEmpreinteSource(source({
      semaines: [{
        numero: 1,
        items: [],
        pages: 'p. 11',
        mots_exemple: [],
      }],
    }))
    const mots = await calculerEmpreinteSource(source({
      semaines: [{
        numero: 1,
        items: [],
        pages: '',
        mots_exemple: ['dix objets'],
      }],
    }))

    expect(pagesA).not.toBe(pagesB)
    expect(pagesA).not.toBe(mots)
  })

  test('ignore les periodes et domaines vides mais conserve l ordre pedagogique', async () => {
    const base = sourceProgrammation({
      periodes: [{
        numero: 1,
        domaines: [
          { nom: 'Vide', items: ['  '] },
          { nom: 'Nombres', items: ['Compter', 'Comparer'] },
        ],
      }, {
        numero: 2,
        domaines: [],
      }],
    })
    const sansSquelette = sourceProgrammation({
      periodes: [{
        numero: 1,
        domaines: [{ nom: 'Nombres', items: ['Compter', 'Comparer'] }],
      }],
    })
    const ordreInverse = sourceProgrammation({
      periodes: [{
        numero: 1,
        domaines: [{ nom: 'Nombres', items: ['Comparer', 'Compter'] }],
      }],
    })

    expect(await calculerEmpreinteSource(base)).toBe(
      await calculerEmpreinteSource(sansSquelette),
    )
    expect(await calculerEmpreinteSource(base)).not.toBe(
      await calculerEmpreinteSource(ordreInverse),
    )
  })

  test('change l empreinte quand le contenu pedagogique change', async () => {
    const a = await calculerEmpreinteSource(source({ semaines: [{ items: ['a'] }] }))
    const b = await calculerEmpreinteSource(source({ semaines: [{ items: ['b'] }] }))

    expect(a).not.toBe(b)
  })

  test('donne la meme empreinte aux objets equivalents avec des cles inversees', async () => {
    const a = await calculerEmpreinteSource(source({ semaines: [{ numero: 1, items: ['a'] }] }))
    const b = await calculerEmpreinteSource(source({ semaines: [{ items: ['a'], numero: 1 }] }))

    expect(a).toBe(b)
  })

  test('canonicalise les cles Unicode distinctes dans un ordre binaire stable', async () => {
    const a = await calculerEmpreinteSource(source({
      semaines: [{ é: 'compose', 'e\u0301': 'decompose' }],
    }))
    const b = await calculerEmpreinteSource(source({
      semaines: [{ 'e\u0301': 'decompose', é: 'compose' }],
    }))

    expect(a).toBe(b)
  })

  test.each([
    [{ ...source(), typeDocument: 'periode', periodeNumero: null }, false],
    [{ ...source(), typeDocument: 'periode', periodeNumero: 0 }, false],
    [{ ...source(), typeDocument: 'periode', periodeNumero: 6 }, false],
    [{ ...source(), typeDocument: 'periode', periodeNumero: 2.5 }, false],
    [{ ...source(), creeLe: undefined }, false],
    [{ ...source(), creeLe: 'date-invalide' }, false],
    [
      { ...source(), periodeNumero: 2 },
      false,
    ],
    [source(), true],
  ])('valide les combinaisons type et periode a la frontiere IA', (valeur, attendu) => {
    expect(estSourceProgressionValide(valeur)).toBe(attendu)
  })
})
