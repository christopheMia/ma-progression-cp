import {
  construireBriques,
  redigerAppreciation,
  type ElementLivret,
  type EntreeBriques,
} from '@/lib/briques-bilan'

function element(p: Partial<ElementLivret> = {}): ElementLivret {
  return {
    competenceId: 'k1',
    matiere: 'francais',
    domaine: 'Lecture',
    libelle: 'Identifier des mots',
    niveau: 'atteint',
    ...p,
  }
}

const formulations = {
  k1: {
    eclat: 'déchiffre seule des mots nouveaux',
    reussite: 'lit avec assurance les mots contenant les sons étudiés',
    encours: 'déchiffre de mieux en mieux les mots étudiés',
    vigilance: 'le déchiffrage demande encore beaucoup d’aide',
    suite: 'nous le travaillerons en petit groupe',
  },
}

function entree(p: Partial<EntreeBriques> = {}): EntreeBriques {
  return {
    elements: [element()],
    formulations,
    motsDeLaSemaine: [],
    ecartees: [],
    retouchees: {},
    ...p,
  }
}

describe('construireBriques', () => {
  it('donne une réussite quand c’est atteint', () => {
    const briques = construireBriques(entree())
    expect(briques[0]).toMatchObject({
      role: 'réussite',
      texte: 'lit avec assurance les mots contenant les sons étudiés',
      suite: '',
      actif: true,
    })
  })

  it('donne la formule d’éclat quand c’est dépassé', () => {
    const briques = construireBriques(entree({ elements: [element({ niveau: 'depasse' })] }))
    expect(briques[0].texte).toBe('déchiffre seule des mots nouveaux')
  })

  it('retombe sur la réussite quand l’éclat n’a pas été écrit', () => {
    const briques = construireBriques(entree({
      elements: [element({ niveau: 'depasse' })],
      formulations: { k1: { ...formulations.k1, eclat: '' } },
    }))
    expect(briques[0].texte).toBe('lit avec assurance les mots contenant les sons étudiés')
  })

  it('donne un progrès quand c’est partiellement atteint', () => {
    const briques = construireBriques(entree({ elements: [element({ niveau: 'partiellement' })] }))
    expect(briques[0]).toMatchObject({
      role: 'progrès',
      texte: 'déchiffre de mieux en mieux les mots étudiés',
    })
  })

  // Regle non negociable : une difficulte ne s'enonce jamais seule.
  it('donne une vigilance suivie de sa prochaine étape quand ce n’est pas atteint', () => {
    const briques = construireBriques(entree({ elements: [element({ niveau: 'non_atteint' })] }))
    expect(briques[0]).toMatchObject({
      role: 'vigilance',
      texte: 'le déchiffrage demande encore beaucoup d’aide',
      suite: 'nous le travaillerons en petit groupe',
    })
  })

  it('n’écrit rien sur une compétence non positionnée', () => {
    expect(construireBriques(entree({ elements: [element({ niveau: null })] }))).toEqual([])
  })

  // Sans phrase ecrite par l'enseignante, on n'invente pas : le libelle
  // officiel est ecrit pour l'institution, pas pour une famille.
  it('n’écrit rien quand la formulation de ce niveau est vide', () => {
    const briques = construireBriques(entree({
      formulations: { k1: { ...formulations.k1, reussite: '' } },
    }))
    expect(briques).toEqual([])
  })

  it('n’écrit rien quand la compétence n’a aucune formulation', () => {
    expect(construireBriques(entree({ formulations: {} }))).toEqual([])
  })

  it('garde la trace de la compétence qui a produit la brique', () => {
    const briques = construireBriques(entree())
    expect(briques[0]).toMatchObject({ cle: 'c:k1', source: 'Identifier des mots' })
  })

  // Demande de Christophe : les commentaires ecrits chaque semaine remontent
  // dans le bilan de la periode.
  it('remonte les mots écrits pendant la période, avec leur semaine', () => {
    const briques = construireBriques(entree({
      motsDeLaSemaine: [{ semaine: 9, matiere: 'francais', texte: 'très à l’aise à l’oral' }],
    }))
    expect(briques[1]).toMatchObject({
      cle: 's:9',
      role: 'ton mot de la semaine 9',
      texte: 'très à l’aise à l’oral',
      actif: true,
    })
  })

  it('ignore un mot de la semaine vide', () => {
    const briques = construireBriques(entree({
      motsDeLaSemaine: [{ semaine: 9, matiere: 'francais', texte: '   ' }],
    }))
    expect(briques).toHaveLength(1)
  })

  it('respecte ce que l’enseignante a décoché', () => {
    const briques = construireBriques(entree({ ecartees: ['c:k1'] }))
    expect(briques[0].actif).toBe(false)
  })

  it('respecte ce qu’elle a réécrit', () => {
    const briques = construireBriques(entree({
      retouchees: { 'c:k1|réussite': { texte: 'lit vraiment bien maintenant', suite: '' } },
    }))
    expect(briques[0].texte).toBe('lit vraiment bien maintenant')
  })

  // Une retouche est gardee par cle ET par role : si le niveau rebascule, une
  // phrase de reussite corrigee ne doit pas se poser sur une difficulte.
  it('oublie la retouche quand le rôle a changé', () => {
    const briques = construireBriques(entree({
      elements: [element({ niveau: 'non_atteint' })],
      retouchees: { 'c:k1|réussite': { texte: 'lit vraiment bien maintenant', suite: '' } },
    }))
    expect(briques[0].texte).toBe('le déchiffrage demande encore beaucoup d’aide')
    expect(briques[0].suite).toBe('nous le travaillerons en petit groupe')
  })

  it('range dans l’ordre de la phrase finale', () => {
    const briques = construireBriques(entree({
      elements: [
        element({ competenceId: 'k1', niveau: 'non_atteint' }),
        element({ competenceId: 'k2', niveau: 'atteint', libelle: 'Copier' }),
      ],
      formulations: { k1: formulations.k1, k2: { ...formulations.k1, reussite: 'copie avec soin' } },
      motsDeLaSemaine: [{ semaine: 9, matiere: 'francais', texte: 'un mot à moi' }],
    }))
    expect(briques.map(b => b.role))
      .toEqual(['réussite', 'vigilance', 'ton mot de la semaine 9'])
  })
})

describe('redigerAppreciation', () => {
  const eleve = { prenom: 'Lina', genre: 'f' as const }

  it('rend une chaîne vide sans brique active', () => {
    expect(redigerAppreciation([], eleve)).toBe('')
    expect(redigerAppreciation(construireBriques(entree({ ecartees: ['c:k1'] })), eleve)).toBe('')
  })

  it('ouvre avec le prénom', () => {
    const texte = redigerAppreciation(construireBriques(entree()), eleve)
    expect(texte).toBe('Lina lit avec assurance les mots contenant les sons étudiés.')
  })

  it('groupe plusieurs réussites en une phrase', () => {
    const briques = construireBriques(entree({
      elements: [
        element({ competenceId: 'k1' }),
        element({ competenceId: 'k2', libelle: 'Copier' }),
      ],
      formulations: { k1: formulations.k1, k2: { ...formulations.k1, reussite: 'copie avec soin' } },
    }))
    expect(redigerAppreciation(briques, eleve))
      .toBe('Lina lit avec assurance les mots contenant les sons étudiés et copie avec soin.')
  })

  it('reprend au pronom après la première phrase', () => {
    const briques = construireBriques(entree({
      elements: [
        element({ competenceId: 'k1' }),
        element({ competenceId: 'k2', niveau: 'partiellement', libelle: 'Copier' }),
      ],
      formulations: { k1: formulations.k1, k2: { ...formulations.k1, encours: 'copie de mieux en mieux' } },
    }))
    expect(redigerAppreciation(briques, eleve))
      .toBe('Lina lit avec assurance les mots contenant les sons étudiés. Elle copie de mieux en mieux.')
  })

  it('emploie « Il » pour un garçon', () => {
    const briques = construireBriques(entree({
      elements: [
        element({ competenceId: 'k1' }),
        element({ competenceId: 'k2', niveau: 'partiellement', libelle: 'Copier' }),
      ],
      formulations: { k1: formulations.k1, k2: { ...formulations.k1, encours: 'copie de mieux en mieux' } },
    }))
    expect(redigerAppreciation(briques, { prenom: 'Tom', genre: 'm' }))
      .toContain('Il copie de mieux en mieux.')
  })

  // Sans genre connu, on ne devine pas : on repete le prenom. Plus lourd,
  // jamais faux.
  it('répète le prénom quand le genre n’est pas renseigné', () => {
    const briques = construireBriques(entree({
      elements: [
        element({ competenceId: 'k1' }),
        element({ competenceId: 'k2', niveau: 'partiellement', libelle: 'Copier' }),
      ],
      formulations: { k1: formulations.k1, k2: { ...formulations.k1, encours: 'copie de mieux en mieux' } },
    }))
    expect(redigerAppreciation(briques, { prenom: 'Camille', genre: null }))
      .toContain('Camille copie de mieux en mieux.')
  })

  // La vigilance parle de la difficulte, pas de l'enfant : elle garde sa
  // tournure impersonnelle, et sa suite la suit toujours.
  it('écrit la difficulté sans sujet, suivie de sa prochaine étape', () => {
    const briques = construireBriques(entree({ elements: [element({ niveau: 'non_atteint' })] }))
    expect(redigerAppreciation(briques, eleve))
      .toBe('Le déchiffrage demande encore beaucoup d’aide ; nous le travaillerons en petit groupe.')
  })

  it('n’écrit jamais un code de niveau ni un libellé technique', () => {
    const briques = construireBriques(entree({
      elements: [
        element({ competenceId: 'k1', niveau: 'non_atteint' }),
        element({ competenceId: 'k2', niveau: 'depasse', libelle: 'Copier un texte court' }),
      ],
      formulations: { k1: formulations.k1, k2: { ...formulations.k1, eclat: 'copie sans la moindre erreur' } },
    }))
    const texte = redigerAppreciation(briques, eleve)
    expect(texte).not.toMatch(/non_atteint|partiellement|depasse|atteint\b/i)
    expect(texte).not.toContain('Identifier des mots')
    expect(texte).not.toContain('Copier un texte court')
  })

  it('place les mots de l’enseignante avant la fin', () => {
    const briques = construireBriques(entree({
      motsDeLaSemaine: [{ semaine: 9, matiere: 'francais', texte: 'ose demander quand elle bloque' }],
    }))
    expect(redigerAppreciation(briques, eleve))
      .toBe('Lina lit avec assurance les mots contenant les sons étudiés. Elle ose demander quand elle bloque.')
  })
})
