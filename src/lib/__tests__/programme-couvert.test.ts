import { grouperNotions, type EntreeGroupement } from '@/lib/programme-couvert'

function entree(p: Partial<EntreeGroupement> = {}): EntreeGroupement {
  return {
    progression: [
      { matiere: 'francais', numero: 1, items: ['Lire a', 'Écrire a'] },
      { matiere: 'francais', numero: 2, items: ['Lire a'] },
      { matiere: 'maths', numero: 1, items: ['Compter jusqu’à 10'] },
    ],
    periodeParSemaine: { 1: 1, 2: 1 },
    liens: [],
    ...p,
  }
}

describe('grouperNotions', () => {
  // Le vrai probleme du 28/07 : le francais affichait 5 340 lignes pour 314
  // notions distinctes. 94 % de repetitions, impossible a parcourir.
  it('rassemble une notion répétée sur plusieurs semaines en une seule ligne', () => {
    const notions = grouperNotions(entree())
    const lire = notions.find(n => n.notion === 'Lire a')
    expect(lire).toMatchObject({ matiere: 'francais', semaines: [1, 2], periode: 1 })
    expect(notions.filter(n => n.notion === 'Lire a')).toHaveLength(1)
  })

  it('garde toutes les matières, pas seulement le français et les maths', () => {
    const notions = grouperNotions(entree({
      progression: [
        { matiere: 'emc', numero: 1, items: ['Respecter les règles'] },
        { matiere: 'arts', numero: 1, items: ['Découvrir une œuvre'] },
      ],
    }))
    expect(notions.map(n => n.matiere).sort()).toEqual(['arts', 'emc'])
  })

  it('range par matière, puis par période, puis par première semaine', () => {
    const notions = grouperNotions(entree({
      progression: [
        { matiere: 'maths', numero: 2, items: ['Comparer'] },
        { matiere: 'francais', numero: 3, items: ['Lire ou'] },
        { matiere: 'francais', numero: 1, items: ['Lire a'] },
      ],
      periodeParSemaine: { 1: 1, 2: 1, 3: 2 },
    }))
    expect(notions.map(n => `${n.matiere}/${n.notion}`))
      .toEqual(['francais/Lire a', 'francais/Lire ou', 'maths/Comparer'])
  })

  it('ignore les items vides', () => {
    const notions = grouperNotions(entree({
      progression: [{ matiere: 'francais', numero: 1, items: ['Lire a', '  ', ''] }],
    }))
    expect(notions).toHaveLength(1)
  })

  it('supporte une progression sans items', () => {
    expect(grouperNotions(entree({
      progression: [{ matiere: 'francais', numero: 1, items: null }],
    }))).toEqual([])
  })

  it('porte la compétence rattachée quand toutes les semaines s’accordent', () => {
    const notions = grouperNotions(entree({
      liens: [
        { matiere: 'francais', semaine_numero: 1, notion: 'Lire a', competence_id: 'k1' },
        { matiere: 'francais', semaine_numero: 2, notion: 'Lire a', competence_id: 'k1' },
      ],
    }))
    expect(notions.find(n => n.notion === 'Lire a')).toMatchObject({
      competenceId: 'k1',
      melange: false,
    })
  })

  // Un heritage possible des rattachements faits semaine par semaine avant le
  // regroupement : on ne choisit pas a la place de l'enseignante.
  it('signale un mélange quand deux semaines ne disent pas la même chose', () => {
    const notions = grouperNotions(entree({
      liens: [
        { matiere: 'francais', semaine_numero: 1, notion: 'Lire a', competence_id: 'k1' },
        { matiere: 'francais', semaine_numero: 2, notion: 'Lire a', competence_id: 'k2' },
      ],
    }))
    expect(notions.find(n => n.notion === 'Lire a')).toMatchObject({
      competenceId: undefined,
      melange: true,
    })
  })

  it('considère non rattachée une notion dont une seule semaine est liée', () => {
    const notions = grouperNotions(entree({
      liens: [{ matiere: 'francais', semaine_numero: 1, notion: 'Lire a', competence_id: 'k1' }],
    }))
    expect(notions.find(n => n.notion === 'Lire a')).toMatchObject({
      competenceId: 'k1',
      melange: false,
      partiel: true,
    })
  })

  it('range hors période ce qui n’a pas de période', () => {
    const notions = grouperNotions(entree({
      progression: [{ matiere: 'francais', numero: 40, items: ['Notion tardive'] }],
      periodeParSemaine: {},
    }))
    expect(notions[0].periode).toBeNull()
  })

  // Une notion qui traverse deux periodes se rattache a la premiere : elle ne
  // doit pas apparaitre deux fois, sinon on retombe dans le defilement.
  it('n’apparaît qu’une fois même si elle traverse deux périodes', () => {
    const notions = grouperNotions(entree({
      progression: [
        { matiere: 'francais', numero: 2, items: ['Lire a'] },
        { matiere: 'francais', numero: 9, items: ['Lire a'] },
      ],
      periodeParSemaine: { 2: 1, 9: 2 },
    }))
    expect(notions).toHaveLength(1)
    expect(notions[0]).toMatchObject({ periode: 1, semaines: [2, 9] })
  })
})
