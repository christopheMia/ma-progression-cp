import {
  motsDe,
  notionsSemblables,
  similarite,
  tete,
} from '@/lib/notions-semblables'

describe('motsDe', () => {
  it('découpe en mots comparables, sans accent ni ponctuation', () => {
    expect(motsDe('Lire à voix haute, après préparation !'))
      .toEqual(['lire', 'a', 'voix', 'haute', 'apres', 'preparation'])
  })

  it('supporte les apostrophes typographiques comme les droites', () => {
    expect(motsDe('L’étude d’un son')).toEqual(motsDe("L'etude d'un son"))
  })

  it('rend une liste vide pour du vide', () => {
    expect(motsDe('   ')).toEqual([])
    expect(motsDe('...')).toEqual([])
  })
})

describe('tete', () => {
  // En pratique une notion commence par son verbe : « Lire a », « Écrire le
  // son », « Comparer des nombres ». C'est le signal le plus fiable.
  it('rend le premier mot porteur', () => {
    expect(tete('Lire a')).toBe('lire')
    expect(tete('Écrire la lettre a')).toBe('ecrire')
  })

  it('saute les articles de tête', () => {
    expect(tete('Le son [a]')).toBe('son')
    expect(tete('L’addition posée')).toBe('addition')
  })

  it('rend une chaîne vide quand il n’y a rien à lire', () => {
    expect(tete('   ')).toBe('')
    expect(tete('les des du')).toBe('')
  })
})

describe('similarite', () => {
  it('vaut 1 pour deux fois la même notion, à la casse et aux accents près', () => {
    expect(similarite('Lire a', 'LIRE À')).toBe(1)
  })

  it('vaut 0 quand rien n’est commun', () => {
    expect(similarite('Lire a', 'Comparer deux nombres')).toBe(0)
  })

  // Piege reel : dans « Lire a », le « a » est le graphème etudie, alors que
  // dans « jusqu'à » c'est une preposition. La comparaison de mots ne peut pas
  // faire la difference, et elle rend donc un petit score. C'est sans
  // consequence : le regroupement est decide par le verbe, et 0,2 reste tres
  // en dessous du seuil.
  it('rend un petit score quand seul un mot d’une lettre est partagé', () => {
    expect(similarite('Lire a', 'Compter jusqu’à 10')).toBeCloseTo(0.2)
    expect(notionsSemblables('Lire a', [{ notion: 'Compter jusqu’à 10' }])).toEqual([])
  })

  it('mesure la part de mots communs', () => {
    // { lire, a } et { lire, ch } partagent « lire » sur trois mots distincts.
    expect(similarite('Lire a', 'Lire ch')).toBeCloseTo(1 / 3)
  })

  it('vaut 0 face à du vide', () => {
    expect(similarite('Lire a', '   ')).toBe(0)
  })
})

describe('notionsSemblables', () => {
  const notions = [
    { semaine: 1, notion: 'Lire a' },
    { semaine: 2, notion: 'Lire i' },
    { semaine: 3, notion: 'Lire ch' },
    { semaine: 4, notion: 'Écrire la lettre a' },
    { semaine: 5, notion: 'Comparer deux nombres' },
  ]

  // Le cas de Christophe : les quatorze « Lire ... » se rattachaient une par une.
  it('regroupe les notions qui commencent par le même verbe', () => {
    expect(notionsSemblables('Lire a', notions).map(n => n.notion))
      .toEqual(['Lire i', 'Lire ch'])
  })

  it('n’inclut jamais la notion de référence elle-même', () => {
    const trouvees = notionsSemblables('Lire a', notions)
    expect(trouvees.some(n => n.notion === 'Lire a')).toBe(false)
  })

  it('écarte un autre verbe même quand un mot est commun', () => {
    // « Écrire la lettre a » partage « a » avec « Lire a », mais ce n'est pas
    // le même geste : rattacher les deux ensemble serait une faute.
    expect(notionsSemblables('Lire a', notions).map(n => n.notion))
      .not.toContain('Écrire la lettre a')
  })

  it('retient aussi une notion très proche sans le même verbe', () => {
    const proches = [
      { semaine: 1, notion: 'Identifier des mots de manière aisée' },
      { semaine: 2, notion: 'Reconnaître des mots de manière aisée' },
    ]
    expect(notionsSemblables(proches[0].notion, proches).map(n => n.notion))
      .toEqual(['Reconnaître des mots de manière aisée'])
  })

  it('rend une liste vide quand la référence n’a pas de mot', () => {
    expect(notionsSemblables('...', notions)).toEqual([])
  })

  it('garde l’ordre reçu', () => {
    const desordre = [
      { semaine: 9, notion: 'Lire ou' },
      { semaine: 2, notion: 'Lire i' },
    ]
    expect(notionsSemblables('Lire a', desordre).map(n => n.semaine)).toEqual([9, 2])
  })

  it('ne rend pas deux fois la même notion écrite deux fois', () => {
    const doublons = [
      { semaine: 1, notion: 'Lire i' },
      { semaine: 2, notion: 'Lire i' },
    ]
    expect(notionsSemblables('Lire a', doublons)).toHaveLength(2)
  })
})
