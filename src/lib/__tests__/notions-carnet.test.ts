import { placerNotionsDuJour, type CreneauNotions } from '../notions-creneaux'

const cr = (nom: string, progression: number | null = null, general = false, ouvert = true): CreneauNotions =>
  ({ nom, progression, general, ouvert })

const CHANT = 'Chant : L’Europe'

describe('placerNotionsDuJour et le carnet', () => {
  it('sans carnet, rien ne change : la notion à son nom va dans sa case', () => {
    const { parCreneau } = placerNotionsDuJour([cr('Chant', 0)], [[CHANT]])
    expect(parCreneau).toEqual([[{ progression: 0, rang: 0 }]])
  })

  it('une notion du carnet va dans les cases données, même une case fermée aux notions', () => {
    const { parCreneau } = placerNotionsDuJour(
      [cr('Musique', 0), cr('Ateliers de français', null, false, false)],
      [[CHANT]], undefined, () => new Set([1]),
    )
    expect(parCreneau).toEqual([[], [{ progression: 0, rang: 0 }]])
  })

  it('une notion du carnet ne va ni dans la case à son nom, ni dans la case générale', () => {
    const { parCreneau } = placerNotionsDuJour(
      [cr('Chant', 0), cr('Arts', 0, true)], [[CHANT]], undefined, () => new Set<number>(),
    )
    expect(parCreneau).toEqual([[], []])
  })

  it('les autres notions gardent leur placement', () => {
    const { parCreneau } = placerNotionsDuJour(
      [cr('Musique', 0), cr('Arts', 0, true)],
      [[CHANT, 'Arts plastiques : tour Eiffel']], undefined,
      (_k, rang) => (rang === 0 ? new Set([0]) : undefined),
    )
    expect(parCreneau).toEqual([[{ progression: 0, rang: 0 }], [{ progression: 0, rang: 1 }]])
  })

  it('une notion du carnet n’est jamais « continuée » par un créneau partagé', () => {
    // Sans progression, le poème qui continue SERAIT « continué » sans carnet.
    const sansCarnet = placerNotionsDuJour([cr('EMC / Poésie')], [['Poésie : Trois escargots']], [[false]])
    expect(sansCarnet.continuees).toEqual([{ progression: 0, rang: 0 }])
    const { continuees } = placerNotionsDuJour(
      [cr('EMC / Poésie')], [['Poésie : Trois escargots']], [[false]], () => new Set<number>(),
    )
    expect(continuees).toEqual([])
  })
})
