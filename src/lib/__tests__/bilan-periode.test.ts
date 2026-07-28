import { construireBilanPeriode, type EntreeBilan } from '@/lib/bilan-periode'

const competences = [
  { id: 'k1', matiere: 'francais', domaine: 'Lecture', libelle: 'Identifier des mots' },
  { id: 'k2', matiere: 'francais', domaine: 'Écriture', libelle: 'Copier un texte court' },
  { id: 'k3', matiere: 'maths', domaine: 'Nombres', libelle: 'Nommer les nombres jusqu’à 100' },
]

const rattachements = [
  { matiere: 'francais', semaine: 8, notion: 'Lire a', competenceId: 'k1' },
  { matiere: 'francais', semaine: 9, notion: 'Lire i', competenceId: 'k1' },
  { matiere: 'francais', semaine: 9, notion: 'Copier une phrase', competenceId: 'k2' },
  { matiere: 'maths', semaine: 8, notion: 'Les nombres jusqu’à 20', competenceId: 'k3' },
]

function entree(p: Partial<EntreeBilan> = {}): EntreeBilan {
  return {
    semaines: [8, 9],
    competences,
    rattachements,
    observations: [],
    ...p,
  }
}

describe('construireBilanPeriode', () => {
  it('ne retient que les compétences travaillées pendant la période', () => {
    const elements = construireBilanPeriode(entree({ semaines: [8] }))
    expect(elements.map(e => e.competenceId)).toEqual(['k1', 'k3'])
  })

  it('garde une compétence travaillée même sans aucune observation', () => {
    const elements = construireBilanPeriode(entree())
    expect(elements.find(e => e.competenceId === 'k2')).toMatchObject({
      niveau: null,
      observations: 0,
    })
  })

  it('groupe les notions d’une même compétence sur une seule ligne', () => {
    const elements = construireBilanPeriode(entree({
      observations: [
        { semaine: 8, matiere: 'francais', notion: 'Lire a', niveau: 'partiellement' },
        { semaine: 9, matiere: 'francais', notion: 'Lire i', niveau: 'atteint' },
      ],
    }))
    const lecture = elements.find(e => e.competenceId === 'k1')
    expect(lecture).toMatchObject({ observations: 2, niveau: 'atteint', derniereSemaine: 9 })
  })

  // Une periode raconte une progression : ce que l'enfant sait EN FIN de
  // periode est ce qui compte, pas ce qu'il savait au debut.
  it('propose le niveau le plus récent, pas le premier', () => {
    const elements = construireBilanPeriode(entree({
      observations: [
        { semaine: 9, matiere: 'francais', notion: 'Lire i', niveau: 'non_atteint' },
        { semaine: 8, matiere: 'francais', notion: 'Lire a', niveau: 'atteint' },
      ],
    }))
    expect(elements.find(e => e.competenceId === 'k1')).toMatchObject({
      niveau: 'non_atteint',
      derniereSemaine: 9,
    })
  })

  // Deux notions la meme semaine sur la meme competence : on retient la plus
  // avancee. Une reussite prouve une capacite, un echec sur une autre notion
  // ne l'efface pas.
  it('retient le niveau le plus avancé quand la même semaine en donne deux', () => {
    const elements = construireBilanPeriode(entree({
      semaines: [9],
      rattachements: [
        { matiere: 'francais', semaine: 9, notion: 'Lire i', competenceId: 'k1' },
        { matiere: 'francais', semaine: 9, notion: 'Lire ou', competenceId: 'k1' },
      ],
      observations: [
        { semaine: 9, matiere: 'francais', notion: 'Lire i', niveau: 'non_atteint' },
        { semaine: 9, matiere: 'francais', notion: 'Lire ou', niveau: 'atteint' },
      ],
    }))
    expect(elements[0]).toMatchObject({ niveau: 'atteint', observations: 2 })
  })

  it('ignore une observation hors de la période', () => {
    const elements = construireBilanPeriode(entree({
      semaines: [8],
      observations: [
        { semaine: 8, matiere: 'francais', notion: 'Lire a', niveau: 'partiellement' },
        { semaine: 30, matiere: 'francais', notion: 'Lire a', niveau: 'depasse' },
      ],
    }))
    expect(elements.find(e => e.competenceId === 'k1')).toMatchObject({
      niveau: 'partiellement',
      observations: 1,
    })
  })

  it('ignore une observation sur une notion non rattachée', () => {
    const elements = construireBilanPeriode(entree({
      observations: [
        { semaine: 8, matiere: 'francais', notion: 'Notion jamais rattachée', niveau: 'atteint' },
      ],
    }))
    expect(elements.every(e => e.observations === 0)).toBe(true)
  })

  it('range par matière puis par domaine, comme le livret', () => {
    const elements = construireBilanPeriode(entree())
    expect(elements.map(e => `${e.matiere}/${e.domaine}`)).toEqual([
      'francais/Lecture',
      'francais/Écriture',
      'maths/Nombres',
    ])
  })

  it('porte le libellé de la compétence et les notions qui l’ont nourrie', () => {
    const elements = construireBilanPeriode(entree({
      observations: [
        { semaine: 8, matiere: 'francais', notion: 'Lire a', niveau: 'atteint' },
      ],
    }))
    const lecture = elements.find(e => e.competenceId === 'k1')
    expect(lecture?.libelle).toBe('Identifier des mots')
    expect(lecture?.notions).toEqual(['Lire a', 'Lire i'])
  })

  it('rend une liste vide quand la période n’a aucune semaine', () => {
    expect(construireBilanPeriode(entree({ semaines: [] }))).toEqual([])
  })
})
