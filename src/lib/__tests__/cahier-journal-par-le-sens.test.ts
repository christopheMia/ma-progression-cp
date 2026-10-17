import { genererCahierJournal } from '../cahier-journal'
import { TRAME_EDT_CP } from '@/data/trame-edt'
import type { CreneauHoraire, JourJournal, ProgressionMatiere } from '@/types'

/**
 * Placer les séances PAR LE SENS (décision de Christophe du 17/10/2026).
 *
 * Les emplois du temps ci-dessous sont ceux de Cécile, recopiés de
 * `partage/edt.pdf` (période 1) et de la base, fautes de frappe comprises. Les
 * séances sont celles de sa semaine 3. Remplir « dans l'ordre » y mettait le
 * Vocabulaire dans « Ateliers de français » et le Geste d'écriture dans
 * « Etude de la langue », pendant que « Ecriture » restait vide : faux qui a
 * l'air juste.
 */

type Jour = CreneauHoraire['jour']

const METHODE_EMC = 'm-emc'

const c = (
  jour: Jour, ordre: number, matiere: string,
  type: 'cours' | 'routine' = 'cours', methode_id: string | null = null,
): CreneauHoraire => ({
  id: `${jour}-${ordre}`, class_id: 'classe', jour,
  heure_debut: '08:00', heure_fin: '08:30', matiere, ordre,
  couleur: null, type, methode_id, visible_journal: type === 'cours',
})

const LUNDI: CreneauHoraire[] = [
  c('lundi', 0, 'Accueil dans la cour', 'routine'),
  c('lundi', 1, 'Rituel date', 'routine'),
  c('lundi', 3, 'Phonologie encodage décodage'),
  c('lundi', 4, 'Ateliers de français'),
  c('lundi', 5, 'Etude de la langue : vocabulaire ou grammaire'),
  c('lundi', 6, 'Récréation', 'routine'),
  c('lundi', 7, 'Chaque jour compte'),
  c('lundi', 8, 'flash maths'),
  c('lundi', 9, 'mathématiques'),
  c('lundi', 10, 'calcul mental'),
  c('lundi', 12, 'Chut, je lis.'),
  c('lundi', 13, 'Anglais'),
  c('lundi', 14, 'Histoire, géographie, sciences et technologie', 'cours', METHODE_EMC),
  c('lundi', 17, 'Ecriture'),
  c('lundi', 18, 'EMC / Poésie', 'cours', METHODE_EMC),
  c('lundi', 19, "Compréhension écrite ou production d'cérits"),
]

const MARDI: CreneauHoraire[] = [
  c('mardi', 3, 'Phonologie encodage décodage'),
  c('mardi', 4, 'Ateliers de français'),
  c('mardi', 5, 'Etude de la langue : vocabulaire ou grammaire'),
  c('mardi', 12, 'Chut, je lis.'),
  c('mardi', 16, 'Ecriture'),
  c('mardi', 19, "Compréhension d'écrits ou production d'écrits"),
]

const JEUDI: CreneauHoraire[] = [
  c('jeudi', 0, 'Accueil dans la cour', 'routine'),
  c('jeudi', 2, 'Rituel vocabulaire', 'routine'),
  c('jeudi', 3, 'Phonologie encodage décodage'),
  c('jeudi', 4, 'Ateliers de français'),
  c('jeudi', 5, 'Etude de la langue : vocabulaire ou grammaire'),
  c('jeudi', 6, 'Récréation', 'routine'),
  c('jeudi', 7, 'Chaque jour compte'),
  c('jeudi', 8, 'flash maths'),
  c('jeudi', 9, 'Mathématiques'),
  c('jeudi', 10, 'problème'),
  c('jeudi', 11, 'Calcul mental'),
  c('jeudi', 12, 'Chut, je lis.'),
  c('jeudi', 13, 'EPS'),
  c('jeudi', 15, 'Rituel écriture', 'routine'),
  c('jeudi', 16, 'Ecriture'),
  c('jeudi', 17, 'Histoire, géographie, sciences et technologie', 'cours', METHODE_EMC),
  c('jeudi', 18, 'Rituel poésie', 'routine'),
]

const VENDREDI: CreneauHoraire[] = [
  c('vendredi', 3, 'Phonologie encodage décodage'),
  c('vendredi', 4, 'Ateliers de français'),
  c('vendredi', 5, 'Etude de la langue : vocabulaire ou grammaire'),
  c('vendredi', 12, 'Chut, je lis.'),
  c('vendredi', 14, 'Ecriture'),
  c('vendredi', 15, "Compréhension d'cérits ou production d'écrits"),
  c('vendredi', 16, 'EMC', 'cours', METHODE_EMC),
]

const SEMAINE = [...LUNDI, ...MARDI, ...JEUDI, ...VENDREDI]

const FRANCAIS_S3: ProgressionMatiere = {
  methode_id: null, matiere: 'francais', items: [], pages: null, mots_exemple: [],
  seances: [
    { jour: 1, domaine: '', libelle: 'Graphèmes e et é (phono, lecture)' },
    { jour: 1, domaine: 'Langage oral', libelle: 'Langage oral : Voyelles de Rimbaud (S4)' },
    { jour: 1, domaine: '', libelle: 'Vocabulaire (S7)' },
    { jour: 3, domaine: '', libelle: 'Graphème L (phono, encodage, décodage)' },
    { jour: 3, domaine: '', libelle: 'Vocabulaire (S9)' },
    { jour: 3, domaine: '', libelle: 'Geste d’écriture' },
    { jour: 4, domaine: 'LC', libelle: 'LC : Texte au choix' },
  ],
}

const MATHS: ProgressionMatiere = {
  methode_id: null, matiere: 'maths', pages: null, mots_exemple: [],
  items: ['Numération : nombres jusqu’à 20'],
}

const EMC: ProgressionMatiere = {
  methode_id: METHODE_EMC, matiere: 'emc', pages: null, mots_exemple: [],
  items: ['EMC : les règles de la classe'],
}

const journal = (edt = SEMAINE, prog = [FRANCAIS_S3, MATHS, EMC]) => genererCahierJournal(edt, prog)
const jour = (j: JourJournal[], nom: string) => j.find(x => x.jour === nom)!
const dans = (j: JourJournal, matiere: string) => j.seances.find(s => s.matiere === matiere)!.deroulement

describe('placer par le sens : le jeudi réel de Cécile, semaine 3', () => {
  const jeudi = jour(journal(), 'jeudi')

  it('chaque séance va dans le créneau qui porte son nom', () => {
    expect(dans(jeudi, 'Phonologie encodage décodage')).toBe('Graphème L (phono, encodage, décodage)')
    expect(dans(jeudi, 'Etude de la langue : vocabulaire ou grammaire')).toBe('Vocabulaire (S9)')
    expect(dans(jeudi, 'Ecriture')).toBe('Geste d’écriture')
  })

  it('les autres créneaux de français affichent leur nom', () => {
    expect(dans(jeudi, 'Ateliers de français')).toBe('Ateliers de français')
    expect(dans(jeudi, 'Chut, je lis.')).toBe('Chut, je lis.')
  })

  it('rien ne reste à placer', () => {
    expect(jeudi.aPlacer ?? []).toEqual([])
  })

  // Depuis le 17/10/2026, la numération va dans « Mathématiques » seulement ;
  // les autres créneaux de maths affichent leur nom (pas de notion à leur nom).
  it('les créneaux de maths intercalés : la notion dans « Mathématiques », les autres sous leur nom', () => {
    expect(dans(jeudi, 'Mathématiques')).toBe('Numération : nombres jusqu’à 20')
    for (const m of ['Chaque jour compte', 'flash maths', 'problème', 'Calcul mental']) {
      expect(dans(jeudi, m)).toBe(m)
    }
  })
})

describe('placer par le sens : le lundi réel de Cécile, semaine 3', () => {
  const lundi = jour(journal(), 'lundi')

  it('le graphème et le vocabulaire trouvent leur créneau', () => {
    expect(dans(lundi, 'Phonologie encodage décodage')).toBe('Graphèmes e et é (phono, lecture)')
    expect(dans(lundi, 'Etude de la langue : vocabulaire ou grammaire')).toBe('Vocabulaire (S7)')
  })

  it('le langage oral n’a pas de créneau : il part à placer', () => {
    expect(lundi.aPlacer).toEqual([
      { libelle: 'Langage oral : Voyelles de Rimbaud (S4)', origine: null },
    ])
  })

  it('« (phono, lecture) » ne va pas dans le créneau de compréhension', () => {
    expect(dans(lundi, "Compréhension écrite ou production d'cérits"))
      .toBe("Compréhension écrite ou production d'cérits")
  })

  it('les créneaux sans séance affichent leur nom, jamais une séance au jugé', () => {
    expect(dans(lundi, 'Ateliers de français')).toBe('Ateliers de français')
    expect(dans(lundi, 'Ecriture')).toBe('Ecriture')
    expect(dans(lundi, 'Chut, je lis.')).toBe('Chut, je lis.')
  })

  it('les créneaux EMC et sans progression ne bougent pas', () => {
    expect(dans(lundi, 'EMC / Poésie')).toContain('les règles de la classe')
    expect(dans(lundi, 'Anglais')).toBe('Anglais')
  })
})

describe('placer par le sens : cas particuliers', () => {
  it('la LC du vendredi va dans « Compréhension d’écrits ou production d’écrits »', () => {
    const vendredi = jour(journal(), 'vendredi')
    expect(dans(vendredi, "Compréhension d'cérits ou production d'écrits")).toBe('LC : Texte au choix')
    expect(vendredi.aPlacer ?? []).toEqual([])
  })

  it('une séance à deux familles part à placer', () => {
    const prog: ProgressionMatiere = {
      ...FRANCAIS_S3,
      seances: [{ jour: 1, domaine: '', libelle: 'Vocabulaire et PDE (S8)' }],
    }
    const lundi = jour(journal(LUNDI, [prog]), 'lundi')
    expect(dans(lundi, 'Etude de la langue : vocabulaire ou grammaire'))
      .toBe('Etude de la langue : vocabulaire ou grammaire')
    expect(lundi.aPlacer).toEqual([{ libelle: 'Vocabulaire et PDE (S8)', origine: null }])
  })

  it('une séance à deux familles va dans un créneau « Français » s’il y en a un', () => {
    const prog: ProgressionMatiere = {
      ...FRANCAIS_S3,
      seances: [{ jour: 1, domaine: '', libelle: 'Vocabulaire et PDE (S8)' }],
    }
    const lundi = jour(journal([c('lundi', 0, 'Français')], [prog]), 'lundi')
    expect(dans(lundi, 'Français')).toBe('Vocabulaire et PDE (S8)')
    expect(lundi.aPlacer ?? []).toEqual([])
  })

  it('deux créneaux « Etude de la langue » prennent Vocabulaire puis Grammaire', () => {
    const edt = [
      c('mardi', 0, 'Etude de la langue : vocabulaire ou grammaire'),
      c('mardi', 1, 'Ateliers de français'),
      c('mardi', 2, 'Etude de la langue : vocabulaire ou grammaire'),
    ]
    const prog: ProgressionMatiere = {
      ...FRANCAIS_S3,
      seances: [
        { jour: 1, domaine: '', libelle: 'Vocabulaire (S9)' },
        { jour: 1, domaine: '', libelle: 'Grammaire (S8)' },
      ],
    }
    const [mardi] = journal(edt, [prog])
    expect(mardi.seances.map(s => s.deroulement))
      .toEqual(['Vocabulaire (S9)', 'Ateliers de français', 'Grammaire (S8)'])
    expect(mardi.aPlacer ?? []).toEqual([])
  })

  it('un jour sans créneau de français : toutes les séances partent à placer', () => {
    const edt = [c('lundi', 0, 'Mathématiques'), c('lundi', 1, 'EPS')]
    const prog: ProgressionMatiere = {
      ...FRANCAIS_S3,
      seances: [
        { jour: 1, domaine: '', libelle: 'Graphème L (phono, encodage, décodage)' },
        { jour: 1, domaine: '', libelle: 'Vocabulaire (S9)' },
      ],
    }
    const [lundi] = journal(edt, [prog, MATHS])
    expect(lundi.seances.map(s => s.deroulement))
      .toEqual(['Numération : nombres jusqu’à 20', 'EPS'])
    expect(lundi.aPlacer).toEqual([
      { libelle: 'Graphème L (phono, encodage, décodage)', origine: null },
      { libelle: 'Vocabulaire (S9)', origine: null },
    ])
  })

  it('une séance mal formée en base ne fait ni planter ni disparaître un vrai texte', () => {
    const brut = {
      ...FRANCAIS_S3,
      seances: [
        { jour: 1, domaine: '', libelle: 'Vocabulaire (S7)' },
        { jour: '1', domaine: '', libelle: 'Graphème L (phono, encodage, décodage)' },
        { jour: 1, domaine: '', libelle: '' },
        { jour: 1, libelle: null },
        null,
      ],
    } as unknown as ProgressionMatiere
    const [lundi] = journal(LUNDI, [brut])
    expect(dans(lundi, 'Etude de la langue : vocabulaire ou grammaire')).toBe('Vocabulaire (S7)')
    // Le jour écrit en texte (« 1 ») est lu comme le jour 1 par `lireSeances`.
    expect(dans(lundi, 'Phonologie encodage décodage')).toBe('Graphème L (phono, encodage, décodage)')
    expect(lundi.aPlacer ?? []).toEqual([])
    for (const s of lundi.seances) expect(s.deroulement).not.toBe('')
  })

  it('un jour illisible rend la séance non datée, montrée une fois à placer', () => {
    const brut = {
      ...FRANCAIS_S3,
      seances: [
        { jour: 1, domaine: '', libelle: 'Vocabulaire (S7)' },
        { jour: 'lundi', domaine: '', libelle: 'Graphème L (phono, encodage, décodage)' },
      ],
    } as unknown as ProgressionMatiere
    const [lundi] = journal(LUNDI, [brut])
    expect(lundi.aPlacer).toEqual([
      { libelle: 'Graphème L (phono, encodage, décodage)', origine: 'semaine' },
    ])
  })

  it('une séance ambiguë part à placer même s’il y a un créneau « Français »', () => {
    const edt = [
      c('lundi', 0, 'Français'),
      c('lundi', 1, 'Compréhension écrite'),
      c('lundi', 2, "Compréhension ou production d'écrits"),
    ]
    const prog: ProgressionMatiere = {
      ...FRANCAIS_S3, seances: [{ jour: 1, domaine: 'LC', libelle: 'LC : Texte' }],
    }
    const [lundi] = journal(edt, [prog])
    expect(lundi.seances.map(s => s.deroulement))
      .toEqual(['Français', 'Compréhension écrite', "Compréhension ou production d'écrits"])
    expect(lundi.aPlacer).toEqual([{ libelle: 'LC : Texte', origine: null }])
  })

  it('l’affichage passe par la lecture commune des séances (domaine abrégé, domaine écrit devant)', () => {
    const prog: ProgressionMatiere = {
      ...FRANCAIS_S3,
      seances: [
        { jour: 1, domaine: '', libelle: 'Lecture compréhension : Le loup' },
        { jour: 1, domaine: 'Vocabulaire', libelle: 'Les fruits (S2)' },
      ],
    }
    const [lundi] = journal(LUNDI, [prog])
    expect(dans(lundi, "Compréhension écrite ou production d'cérits")).toBe('LC : Le loup')
    expect(dans(lundi, 'Etude de la langue : vocabulaire ou grammaire')).toBe('Vocabulaire : Les fruits (S2)')
  })
})

describe('placer par le sens : la trame par défaut', () => {
  // Le mardi de la trame a « Appropriation des graphèmes » ET « Phonologie » :
  // deux noms pour la même famille. Le créneau qui écrit le mot de la séance
  // l'emporte ; sinon, rien n'est deviné.
  const edt: CreneauHoraire[] = TRAME_EDT_CP.map((t, i) => ({
    ...t, id: `t-${i}`, class_id: 'classe', jour: t.jour as Jour,
    methode_id: null, visible_journal: t.type === 'cours',
  }))
  const prog: ProgressionMatiere = {
    ...FRANCAIS_S3,
    seances: [
      { jour: 2, domaine: '', libelle: 'Graphème L (phono, encodage, décodage)' },
      { jour: 2, domaine: 'Phonologie', libelle: 'Phonologie : le son [l]' },
      { jour: 2, domaine: '', libelle: 'Vocabulaire (S9)' },
      { jour: 2, domaine: 'PDE', libelle: 'PDE (S5)' },
      { jour: 2, domaine: '', libelle: 'Geste d’écriture' },
      { jour: 2, domaine: '', libelle: 'Encodage de syllabes' },
    ],
  }
  const mardi = jour(journal(edt, [prog, MATHS]), 'mardi')

  it('le graphème va dans « Appropriation des graphèmes », la phonologie dans « Phonologie »', () => {
    expect(dans(mardi, 'Appropriation des graphèmes')).toBe('Graphème L (phono, encodage, décodage)')
    expect(dans(mardi, 'Phonologie')).toBe('Phonologie : le son [l]')
  })

  it('le vocabulaire et la PDE trouvent leur créneau', () => {
    expect(dans(mardi, 'Vocabulaire')).toBe('Vocabulaire (S9)')
    expect(dans(mardi, "Production d'écrits")).toBe('PDE (S5)')
  })

  it('« Lecture-écriture » ne reçoit rien, et ce qui n’a pas de créneau sûr part à placer', () => {
    expect(dans(mardi, 'Lecture-écriture')).toBe('Lecture-écriture')
    expect(mardi.aPlacer).toEqual([
      { libelle: 'Geste d’écriture', origine: null },
      { libelle: 'Encodage de syllabes', origine: null },
    ])
  })
})
