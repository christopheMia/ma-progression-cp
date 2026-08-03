import { seancesDepuisItems, itemsDepuisSeances } from '../progression-seances'

describe('seancesDepuisItems', () => {
  it('lit le jour dans le préfixe et le retire du libellé', () => {
    expect(seancesDepuisItems(['Jour 2 : Grammaire'])).toEqual([
      { jour: 2, domaine: '', libelle: 'Grammaire' },
    ])
  })

  it('laisse jour à null quand il n’y a pas de préfixe', () => {
    expect(seancesDepuisItems(['Nombres jusqu’à 10'])).toEqual([
      { jour: null, domaine: '', libelle: 'Nombres jusqu’à 10' },
    ])
  })

  it('ne prend pas le « (séance 3) » du document pour un jour', () => {
    expect(seancesDepuisItems(['LC : La petite poule (séance 3)'])).toEqual([
      { jour: null, domaine: 'LC', libelle: 'LC : La petite poule (séance 3)' },
    ])
  })

  it('garde le domaine écrit avant les deux points', () => {
    expect(seancesDepuisItems(['Jour 1 : Vocabulaire : les émotions'])).toEqual([
      { jour: 1, domaine: 'Vocabulaire', libelle: 'Vocabulaire : les émotions' },
    ])
  })

  it('ignore les entrées vides', () => {
    expect(seancesDepuisItems(['', '   '])).toEqual([])
  })
})

describe('itemsDepuisSeances', () => {
  it('remet le préfixe de jour pour que l’ancien affichage reste identique', () => {
    expect(itemsDepuisSeances([
      { jour: 2, domaine: '', libelle: 'Grammaire' },
      { jour: null, domaine: '', libelle: 'Nombres jusqu’à 10' },
    ])).toEqual(['Jour 2 : Grammaire', 'Nombres jusqu’à 10'])
  })

  it('fait l’aller-retour sans rien perdre', () => {
    const items = ['Jour 1 : LC : La petite poule (séance 1)', 'Jour 3 : Fluence']
    expect(itemsDepuisSeances(seancesDepuisItems(items))).toEqual(items)
  })
})
