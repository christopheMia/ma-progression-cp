import { genererCahierJournal } from '../cahier-journal'
import { creneauNommePour, domainesNotion } from '../notions-creneaux'
import type { CreneauHoraire, JourJournal, ProgressionMatiere } from '@/types'

/**
 * Les progressions de NOTIONS (maths, histoire-géographie-sciences-EMC, arts)
 * dans le cahier journal : chaque notion dans le créneau qui porte son nom.
 *
 * Ce que Christophe a vu le 17/10/2026 sur la classe de test, le lundi de la
 * semaine 3 : « Chaque jour compte », « flash maths », « mathématiques » et
 * « calcul mental » affichaient TOUS la même phrase, les trois notions de la
 * semaine collées par des virgules. Sa demande : « il faut écrire des choses
 * lisibles et structurer ». Règle validée le 17/10 :
 * - chaque notion va dans le créneau qui porte son nom (« Problèmes : ... »
 *   dans « Problème », « Calcul mental : ... » dans « Calcul mental ») ;
 * - ce qui n'a pas de créneau à son nom va dans le créneau général de la
 *   matière (« Mathématiques ») ;
 * - les rituels (Chaque jour compte, Flash maths) affichent leur nom ;
 * - plusieurs notions dans un créneau : une par ligne, jamais à la virgule.
 *
 * Les créneaux sont ceux de la classe de test, lus en base le 17/10 (fautes de
 * frappe comprises). Les notions sont celles de ses semaines 3 et 12, certains
 * textes raccourcis : seul leur domaine, devant les deux points, décide.
 */

type Jour = CreneauHoraire['jour']

const METHODE_EMC = 'm-emc'

const c = (jour: Jour, ordre: number, matiere: string, methode_id: string | null = null): CreneauHoraire => ({
  id: `${jour}-${ordre}`, class_id: 'classe', jour,
  heure_debut: '08:00', heure_fin: '08:30', matiere, ordre,
  couleur: null, type: 'cours', methode_id, visible_journal: true,
})

const FRANCAIS_MATIN = (jour: Jour) => [
  c(jour, 3, 'Phonologie encodage décodage'),
  c(jour, 4, 'Ateliers de français'),
  c(jour, 5, 'Etude de la langue : vocabulaire ou grammaire'),
]

const LUNDI: CreneauHoraire[] = [
  ...FRANCAIS_MATIN('lundi'),
  c('lundi', 7, 'Chaque jour compte'),
  c('lundi', 8, 'flash maths'),
  c('lundi', 9, 'mathématiques'),
  c('lundi', 10, 'calcul mental'),
  c('lundi', 12, 'Chut, je lis.'),
  c('lundi', 13, 'Anglais'),
  c('lundi', 14, 'Histoire, géographie, sciences et technologie', METHODE_EMC),
  c('lundi', 17, 'Ecriture'),
  c('lundi', 18, 'EMC / Poésie', METHODE_EMC),
  c('lundi', 19, "Compréhension écrite ou production d'cérits"),
]

const MARDI: CreneauHoraire[] = [
  ...FRANCAIS_MATIN('mardi'),
  c('mardi', 12, 'Chut, je lis.'),
  c('mardi', 13, 'Musique'),
  c('mardi', 14, 'EPS'),
  c('mardi', 15, 'Arts plastiques'),
]

const JEUDI: CreneauHoraire[] = [
  ...FRANCAIS_MATIN('jeudi'),
  c('jeudi', 7, 'Chaque jour compte'),
  c('jeudi', 8, 'flash maths'),
  c('jeudi', 9, 'Mathématiques'),
  c('jeudi', 10, 'problème'),
  c('jeudi', 11, 'Calcul mental'),
  c('jeudi', 12, 'Chut, je lis.'),
  c('jeudi', 13, 'EPS'),
  c('jeudi', 16, 'Ecriture'),
  c('jeudi', 17, 'Histoire, géographie, sciences et technologie', METHODE_EMC),
]

const VENDREDI: CreneauHoraire[] = [
  ...FRANCAIS_MATIN('vendredi'),
  c('vendredi', 7, 'Chaque jour compte'),
  c('vendredi', 8, 'flash maths'),
  c('vendredi', 10, 'Problème'),
  c('vendredi', 12, 'Chut, je lis.'),
  c('vendredi', 14, 'Ecriture'),
  c('vendredi', 16, 'EMC', METHODE_EMC),
  c('vendredi', 17, 'Arts plastiques'),
]

const SEMAINE = [...LUNDI, ...MARDI, ...JEUDI, ...VENDREDI]

const notions = (matiere: string, items: string[], methode_id: string | null = null): ProgressionMatiere => ({
  methode_id, matiere, items, pages: null, mots_exemple: [],
})

const NUMERATION = 'Numération : Groupements par 5'
const PROBLEMES = 'Problèmes : Résoudre des problèmes additifs en une étape du type parties-tout : recherche du tout'
const CALCUL = "Calcul mental : Table d'addition : les doubles"
const HISTOIRE = 'Histoire : Le jour et la nuit : la journée de l’élève'
const GEOGRAPHIE = 'Géographie : Le Royaume Uni'
const POESIE = 'Poésie : Poésie sur la rentrée : Trois escargots de Maurice Carême'
const ARTS_PLASTIQUES = 'Arts plastiques : Dessiner la tour Eiffel'

const SEMAINE_3 = [
  notions('maths', [NUMERATION, PROBLEMES, CALCUL]),
  notions('emc', [HISTOIRE, GEOGRAPHIE], METHODE_EMC),
  notions('arts', [POESIE, ARTS_PLASTIQUES]),
]

const SENEGAL = 'Géographie : Sénégal'
const ZIMBABWE = 'Géographie : Zimbabwe'
const ECOLE = "Géographie : Se repérer dans l'école"
const TEMPERATURE = 'Sciences : Le relevé de température : 1er décembre'
const FAMILLES = 'EMC/EVARS/PHARE : Les différents types de famille'

const SEMAINE_12 = [
  notions('maths', [NUMERATION, PROBLEMES, CALCUL]),
  notions('emc', [SENEGAL, ZIMBABWE, ECOLE, TEMPERATURE, FAMILLES], METHODE_EMC),
  notions('arts', ['Arts plastiques : Marché de Noël ?']),
]

const jour = (j: JourJournal[], nom: string) => j.find(x => x.jour === nom)!
const dans = (j: JourJournal, matiere: string) => j.seances.find(s => s.matiere === matiere)!.deroulement
const lignes = (...l: string[]) => l.join('\n')

describe('notions par le sens : le lundi de la classe de test, semaine 3', () => {
  const lundi = jour(genererCahierJournal(SEMAINE, SEMAINE_3), 'lundi')

  it('« calcul mental » reçoit la notion de calcul mental, et elle seule', () => {
    expect(dans(lundi, 'calcul mental')).toBe(CALCUL)
  })

  it('« mathématiques » reçoit la numération, et les problèmes qui n’ont pas de créneau ce jour-là', () => {
    expect(dans(lundi, 'mathématiques')).toBe(lignes(NUMERATION, PROBLEMES))
  })

  it('les rituels de maths affichent leur nom', () => {
    expect(dans(lundi, 'Chaque jour compte')).toBe('Chaque jour compte')
    expect(dans(lundi, 'flash maths')).toBe('flash maths')
  })

  it('« Histoire, géographie, sciences et technologie » montre l’histoire puis la géographie, une par ligne', () => {
    expect(dans(lundi, 'Histoire, géographie, sciences et technologie')).toBe(lignes(HISTOIRE, GEOGRAPHIE))
  })

  it('« EMC / Poésie » reçoit la poésie, que son nom écrit en toutes lettres', () => {
    expect(dans(lundi, 'EMC / Poésie')).toBe(POESIE)
  })

  it('un créneau sans progression garde son nom, rien ne reste à placer', () => {
    expect(dans(lundi, 'Anglais')).toBe('Anglais')
    expect(lundi.aPlacer ?? []).toEqual([])
  })
})

describe('notions par le sens : le reste de la semaine 3', () => {
  const journal = genererCahierJournal(SEMAINE, SEMAINE_3)
  const jeudi = jour(journal, 'jeudi')

  it('le jeudi, chaque notion de maths a son créneau', () => {
    expect(dans(jeudi, 'Mathématiques')).toBe(NUMERATION)
    expect(dans(jeudi, 'problème')).toBe(PROBLEMES)
    expect(dans(jeudi, 'Calcul mental')).toBe(CALCUL)
    expect(dans(jeudi, 'Chaque jour compte')).toBe('Chaque jour compte')
    expect(dans(jeudi, 'flash maths')).toBe('flash maths')
  })

  it('le jeudi, l’histoire et la géographie sur deux lignes', () => {
    expect(dans(jeudi, 'Histoire, géographie, sciences et technologie')).toBe(lignes(HISTOIRE, GEOGRAPHIE))
  })

  it('le mardi, « Arts plastiques » reçoit sa notion, « Musique » affiche son nom', () => {
    const mardi = jour(journal, 'mardi')
    expect(dans(mardi, 'Arts plastiques')).toBe(ARTS_PLASTIQUES)
    expect(dans(mardi, 'Musique')).toBe('Musique')
  })

  it('le vendredi, « Problème » reçoit les problèmes, sans créneau général ni la numération', () => {
    const vendredi = jour(journal, 'vendredi')
    expect(dans(vendredi, 'Problème')).toBe(PROBLEMES)
    expect(dans(vendredi, 'EMC')).toBe(lignes(HISTOIRE, GEOGRAPHIE))
  })

  it('aucun créneau n’empile des notions à la virgule', () => {
    const toutes = SEMAINE_3.flatMap(p => p.items)
    for (const j of journal) {
      for (const s of j.seances) {
        for (const ligne of s.deroulement.split('\n')) {
          expect([s.matiere, ...toutes]).toContain(ligne)
        }
      }
    }
  })
})

describe('notions par le sens : la semaine 12', () => {
  const journal = genererCahierJournal(SEMAINE, SEMAINE_12)

  it('le lundi, la géographie et les sciences vont dans le créneau qui les nomme, l’EMC dans « EMC / Poésie »', () => {
    const lundi = jour(journal, 'lundi')
    expect(dans(lundi, 'Histoire, géographie, sciences et technologie'))
      .toBe(lignes(SENEGAL, ZIMBABWE, ECOLE, TEMPERATURE))
    expect(dans(lundi, 'EMC / Poésie')).toBe(FAMILLES)
  })

  it('le vendredi, « EMC » est le créneau général : il reçoit les cinq notions, une par ligne', () => {
    const vendredi = jour(journal, 'vendredi')
    expect(dans(vendredi, 'EMC')).toBe(lignes(SENEGAL, ZIMBABWE, ECOLE, TEMPERATURE, FAMILLES))
  })
})

describe('notions par le sens : cas particuliers', () => {
  it('une matière qui n’a qu’un créneau général reçoit toutes ses notions, une par ligne', () => {
    const [lundi] = genererCahierJournal([c('lundi', 0, 'Maths')], [SEMAINE_3[0]])
    expect(dans(lundi, 'Maths')).toBe(lignes(NUMERATION, PROBLEMES, CALCUL))
    expect(lundi.aPlacer ?? []).toEqual([])
  })

  it('chaque notion de la semaine paraît au moins une fois, dans un créneau ou à placer', () => {
    for (const [edt, progression] of [
      [SEMAINE, SEMAINE_3], [SEMAINE, SEMAINE_12], [LUNDI, SEMAINE_3], [MARDI, SEMAINE_12],
    ] as const) {
      const journal = genererCahierJournal([...edt], [...progression])
      const vus = journal.flatMap(j => [
        ...j.seances.flatMap(s => s.deroulement.split('\n')),
        ...(j.aPlacer ?? []).map(a => a.libelle),
      ])
      for (const item of progression.flatMap(p => p.items)) expect(vus).toContain(item)
    }
  })

  it('une notion sans créneau un jour mais avec un créneau un autre jour ne part pas à placer', () => {
    const edt = [c('lundi', 0, 'calcul mental'), c('jeudi', 0, 'problème')]
    const journal = genererCahierJournal(edt, [notions('maths', [PROBLEMES, CALCUL])])
    expect(dans(jour(journal, 'lundi'), 'calcul mental')).toBe(CALCUL)
    expect(dans(jour(journal, 'jeudi'), 'problème')).toBe(PROBLEMES)
    for (const j of journal) expect(j.aPlacer ?? []).toEqual([])
  })

  it('une notion sans aucun créneau de la semaine part à placer une seule fois, le premier jour', () => {
    const edt = [c('lundi', 0, 'Chaque jour compte'), c('jeudi', 0, 'Chaque jour compte')]
    const [lundi, jeudi] = genererCahierJournal(edt, [notions('maths', [NUMERATION, CALCUL])])
    expect(dans(lundi, 'Chaque jour compte')).toBe('Chaque jour compte')
    expect(lundi.aPlacer).toEqual([
      { libelle: NUMERATION, origine: 'semaine' },
      { libelle: CALCUL, origine: 'semaine' },
    ])
    expect(jeudi.aPlacer ?? []).toEqual([])
  })

  it('une progression sans aucun créneau dans l’emploi du temps part à placer, plutôt que de disparaître', () => {
    // Avant le 17/10, ses notions n'étaient montrées nulle part, sans le dire.
    const [lundi] = genererCahierJournal([c('lundi', 0, 'EPS')], [notions('maths', [NUMERATION])])
    expect(dans(lundi, 'EPS')).toBe('EPS')
    expect(lundi.aPlacer).toEqual([{ libelle: NUMERATION, origine: 'semaine' }])
  })

  it('les pages et les mots s’écrivent une fois, au créneau général', () => {
    const maths = { ...notions('maths', [NUMERATION, CALCUL]), pages: 'p.12', mots_exemple: ['cinq'] }
    const [lundi] = genererCahierJournal(
      [c('lundi', 0, 'calcul mental'), c('lundi', 1, 'mathématiques'), c('lundi', 2, 'Chaque jour compte')], [maths],
    )
    expect(dans(lundi, 'mathématiques')).toContain(NUMERATION)
    expect(dans(lundi, 'mathématiques')).toContain('p.12')
    expect(dans(lundi, 'mathématiques')).toContain('(mots : cinq)')
    expect(dans(lundi, 'calcul mental')).toBe(CALCUL)
    expect(dans(lundi, 'Chaque jour compte')).toBe('Chaque jour compte')
  })

  it('sans créneau général, les pages vont au premier créneau qui montre une notion', () => {
    const maths = { ...notions('maths', [NUMERATION, CALCUL]), pages: 'p.12', mots_exemple: [] }
    const [lundi] = genererCahierJournal([c('lundi', 0, 'Chaque jour compte'), c('lundi', 1, 'calcul mental')], [maths])
    expect(dans(lundi, 'calcul mental')).toContain('p.12')
    expect(dans(lundi, 'Chaque jour compte')).toBe('Chaque jour compte')
  })

  it('sans aucun créneau pour ses notions, les pages suivent les notions à placer', () => {
    const maths = { ...notions('maths', [NUMERATION]), pages: 'p.12', mots_exemple: [] }
    const [lundi] = genererCahierJournal([c('lundi', 0, 'Chaque jour compte')], [maths])
    expect(lundi.aPlacer).toHaveLength(1)
    expect(lundi.aPlacer![0].libelle).toContain(NUMERATION)
    expect(lundi.aPlacer![0].libelle).toContain('p.12')
  })

  it('un créneau de séances de français ne reçoit jamais une notion, même s’il en porte le nom', () => {
    const francais: ProgressionMatiere = {
      methode_id: null, matiere: 'francais', items: [], pages: null, mots_exemple: [],
      seances: [{ jour: 1, domaine: '', libelle: 'Geste d’écriture' }],
    }
    const arts = notions('arts', ['Ecriture : calligraphie', ARTS_PLASTIQUES])
    const [lundi] = genererCahierJournal(
      [c('lundi', 0, 'Ecriture'), c('lundi', 1, 'Arts plastiques')], [francais, arts],
    )
    expect(dans(lundi, 'Ecriture')).toBe('Geste d’écriture')
    expect(dans(lundi, 'Arts plastiques')).toBe(ARTS_PLASTIQUES)
    expect(lundi.aPlacer).toEqual([{ libelle: 'Ecriture : calligraphie', origine: 'semaine' }])
  })

  it('les anciennes lignes datées « Jour N » gardent leur jour, mais une ligne par item', () => {
    const ancien = notions('francais', ['Jour 1 : LC : La petite poule (S1)', "Jour 1 : Geste d'écriture", 'Jour 2 : Grammaire'])
    const [lundi] = genererCahierJournal([c('lundi', 0, 'Phonologie'), c('mardi', 0, 'Phonologie')], [ancien])
    expect(dans(lundi, 'Phonologie')).toBe(lignes('LC : La petite poule (S1)', "Geste d'écriture"))
  })
})

describe('domaine d’une notion et nom de créneau', () => {
  it('le domaine est ce qui précède les premiers deux points, une barre oblique sépare des domaines', () => {
    expect(domainesNotion(PROBLEMES)).toEqual(['Problèmes'])
    expect(domainesNotion(FAMILLES)).toEqual(['EMC', 'EVARS', 'PHARE'])
    expect(domainesNotion('Les nombres jusqu’à 10')).toEqual([])
  })

  it('un créneau est nommé pour une notion quand il écrit son domaine en entier, pluriel compris', () => {
    expect(creneauNommePour('problème', PROBLEMES)).toBe(true)
    expect(creneauNommePour('Problèmes', 'Problème : un seul')).toBe(true)
    expect(creneauNommePour('calcul mental', CALCUL)).toBe(true)
    expect(creneauNommePour('Histoire, géographie, sciences et technologie', TEMPERATURE)).toBe(true)
    expect(creneauNommePour('EMC / Poésie', FAMILLES)).toBe(true)
    expect(creneauNommePour('mathématiques', NUMERATION)).toBe(false)
    expect(creneauNommePour('Calcul', CALCUL)).toBe(false)
    expect(creneauNommePour('Chaque jour compte', NUMERATION)).toBe(false)
    expect(creneauNommePour('Mathématiques', 'Les nombres jusqu’à 10')).toBe(false)
  })
})

/**
 * Les réponses de Cécile du 18/10/2026 (mail « 4 petites questions pour
 * l'appli »), sur son vrai emploi du temps : ses cases ne sont reliées à
 * aucune méthode, et « EMC / Poésie » n'existe que le lundi.
 */
describe('réponses de Cécile du 18/10', () => {
  const CALCUL_POSE = 'Calcul : Additions et soustractions avec le matériel de numération'

  it('« poser une addition c’est des mathématiques pas du calcul mental »', () => {
    expect(creneauNommePour('Calcul mental', CALCUL_POSE)).toBe(false)
    const [lundi] = genererCahierJournal(
      [c('lundi', 0, 'Mathématiques'), c('lundi', 1, 'Calcul mental')],
      [notions('maths', [CALCUL_POSE, CALCUL])],
    )
    expect(dans(lundi, 'Mathématiques')).toBe(CALCUL_POSE)
    expect(dans(lundi, 'Calcul mental')).toBe(CALCUL)
  })

  it('un mot de plus dans le nom de la case désigne une autre activité', () => {
    expect(creneauNommePour('Flash maths', 'Maths : les doubles')).toBe(false)
    expect(creneauNommePour('Lecture-écriture', 'Écriture : les boucles')).toBe(false)
    expect(creneauNommePour('Espace et géométrie', 'Géométrie : le carré')).toBe(true)
  })

  it('« Arts plastiques » ne reçoit que la production, pas la poésie ni la musique', () => {
    const arts = notions('arts', [POESIE, ARTS_PLASTIQUES, "Chant : L'Europe"])
    const [mardi] = genererCahierJournal([c('mardi', 0, 'Arts plastiques')], [arts])
    expect(dans(mardi, 'Arts plastiques')).toBe(ARTS_PLASTIQUES)
  })

  describe('« EMC / Poésie » : la poésie la semaine où on la découvre, l’EMC les autres lundis', () => {
    const EDT = [c('lundi', 0, 'EMC / Poésie'), c('vendredi', 0, 'EMC')]
    const IDENTITE = "EMC/EVARS/PHARE : L'identité"
    const POEME_2 = "Poésie : Poésie sur l'automne : Mois d'automne"

    it('semaine d’un nouveau poème : le poème seul, l’EMC le vendredi', () => {
      const [lundi, vendredi] = genererCahierJournal(EDT, [
        notions('emc', [HISTOIRE, IDENTITE]), notions('arts', [POEME_2, ARTS_PLASTIQUES]),
      ], [notions('arts', [POESIE])])
      expect(dans(lundi, 'EMC / Poésie')).toBe(POEME_2)
      expect(dans(vendredi, 'EMC')).toBe(lignes(HISTOIRE, IDENTITE))
    })

    it('semaine où le poème continue : l’EMC, et le poème ne part pas à placer', () => {
      const [lundi] = genererCahierJournal(EDT, [
        notions('emc', [IDENTITE]), notions('arts', [POESIE]),
      ], [notions('arts', [POESIE])])
      expect(dans(lundi, 'EMC / Poésie')).toBe(IDENTITE)
      expect(lundi.aPlacer ?? []).toEqual([])
    })

    it('poème qui continue et pas d’EMC : la case garde son nom', () => {
      const [lundi] = genererCahierJournal(EDT, [
        notions('emc', [HISTOIRE]), notions('arts', [POESIE]),
      ], [notions('arts', [POESIE])])
      expect(dans(lundi, 'EMC / Poésie')).toBe('EMC / Poésie')
      expect(lundi.aPlacer ?? []).toEqual([])
    })

    it('sans la semaine précédente (semaine 1), le poème est nouveau', () => {
      const [lundi] = genererCahierJournal(EDT, [notions('emc', [IDENTITE]), notions('arts', [POESIE])])
      expect(dans(lundi, 'EMC / Poésie')).toBe(POESIE)
    })
  })
})

/**
 * Option B, décision de Christophe du 18/10/2026 : le français qui ne date
 * rien (le sommaire d'un manuel, chez une nouvelle enseignante) garde l'ancien
 * remplissage en attendant l'écran d'accompagnement par l'IA. La relecture du
 * 17/10 avait montré que, sinon, tout son français partait à placer le lundi.
 */
describe('option B : le français sans jours garde l’ancien remplissage', () => {
  const manuel: ProgressionMatiere = {
    methode_id: null, matiere: 'francais', pages: 'p.4-5', mots_exemple: [],
    items: ['Découvrir le son a', 'Lire des syllabes'],
  }

  it('chaque case de français reçoit le manuel de la semaine, une ligne par item', () => {
    const [lundi] = genererCahierJournal(
      [c('lundi', 0, 'Phonologie'), c('lundi', 1, 'Lecture'), c('lundi', 2, 'Mathématiques')],
      [manuel, notions('maths', [NUMERATION])],
    )
    for (const cas of ['Phonologie', 'Lecture']) {
      const [premiere, seconde] = dans(lundi, cas).split('\n')
      expect(premiere).toBe('Découvrir le son a')
      expect(seconde).toMatch(/^Lire des syllabes .* p\.4-5$/)
    }
    expect(dans(lundi, 'Mathématiques')).toBe(NUMERATION)
    expect(lundi.aPlacer ?? []).toEqual([])
  })

  it('le français qui date ses séances garde le placement par le sens', () => {
    const date: ProgressionMatiere = { ...manuel, seances: [{ jour: 1, domaine: '', libelle: 'Geste d’écriture' }] }
    const [lundi] = genererCahierJournal([c('lundi', 0, 'Ecriture'), c('lundi', 1, 'Lecture')], [date])
    expect(dans(lundi, 'Ecriture')).toBe('Geste d’écriture')
    expect(dans(lundi, 'Lecture')).toBe('Lecture')
  })
})

/** Relecture Opus du 18/10/2026 : les cas que la première version laissait passer. */
describe('créneau partagé : relecture du 18/10', () => {
  const IDENTITE = "EMC/EVARS/PHARE : L'identité"
  const POEME_2 = "Poésie : Poésie sur l'automne : Mois d'automne"

  it('sans autre case d’EMC, l’EMC qui continue part à placer la semaine d’un nouveau poème', () => {
    const [lundi] = genererCahierJournal([c('lundi', 0, 'EMC / Poésie')], [
      notions('emc', [IDENTITE]), notions('arts', [POEME_2]),
    ], [notions('emc', [IDENTITE]), notions('arts', [POESIE])])
    expect(dans(lundi, 'EMC / Poésie')).toBe(POEME_2)
    expect(lundi.aPlacer).toEqual([{ libelle: IDENTITE, origine: 'semaine' }])
  })

  it('une semaine sans ligne d’EMC, le poème qui continue ne revient pas chaque lundi', () => {
    const [lundi] = genererCahierJournal([c('lundi', 0, 'EMC / Poésie')], [
      notions('arts', [POESIE]),
    ], [notions('arts', [POESIE])])
    expect(dans(lundi, 'EMC / Poésie')).toBe('EMC / Poésie')
    expect(lundi.aPlacer ?? []).toEqual([])
  })

  it('le même poème avec une apostrophe différente reste le même poème', () => {
    const [lundi] = genererCahierJournal([c('lundi', 0, 'EMC / Poésie'), c('vendredi', 0, 'EMC')], [
      notions('emc', [IDENTITE]), notions('arts', ['Poésie : L’éléphant']),
    ], [notions('arts', ["Poésie : L'éléphant"])])
    expect(dans(lundi, 'EMC / Poésie')).toBe(IDENTITE)
  })

  it('la semaine d’avant se lit par la matière écrite avant la matière reconnue', () => {
    const precedente = [notions('Musique', ['Poésie : autre chose']), notions('arts', [POESIE])]
    const [lundi] = genererCahierJournal([c('lundi', 0, 'EMC / Poésie'), c('vendredi', 0, 'EMC')], [
      notions('emc', [IDENTITE]), notions('arts', [POESIE]),
    ], precedente)
    expect(dans(lundi, 'EMC / Poésie')).toBe(IDENTITE)
  })

  it('« Arts plastiques » : la poésie et le chant partent à placer une seule fois', () => {
    const arts = notions('arts', [POESIE, ARTS_PLASTIQUES, "Chant : L'Europe"])
    const journal = genererCahierJournal([c('mardi', 0, 'Arts plastiques'), c('vendredi', 0, 'Arts plastiques')], [arts])
    expect(journal.flatMap(j => (j.aPlacer ?? []).map(a => a.libelle))).toEqual([POESIE, "Chant : L'Europe"])
  })

  it('la case « Histoire, géographie » de la trame par défaut reçoit ses deux notions', () => {
    const [lundi] = genererCahierJournal([c('lundi', 0, 'Histoire, géographie')], [
      notions('emc', [HISTOIRE, GEOGRAPHIE]),
    ])
    expect(dans(lundi, 'Histoire, géographie')).toBe(lignes(HISTOIRE, GEOGRAPHIE))
  })
})

/**
 * Le vrai emploi du temps de Cécile tel qu'il est en base le 18/10/2026 :
 * AUCUNE case reliée à une méthode. Lundi et vendredi, sur deux semaines.
 */
describe('Cécile, cases sans méthode, deux semaines', () => {
  const sans = (jour: Jour, ordre: number, matiere: string) => c(jour, ordre, matiere, null)
  const EDT = [
    sans('lundi', 8, 'Flash maths'), sans('lundi', 9, 'Mathématiques'), sans('lundi', 10, 'Calcul mental'),
    sans('lundi', 13, 'EPS'), sans('lundi', 14, 'Histoire, géographie, sciences et technologie'),
    sans('lundi', 17, 'EMC / Poésie'),
    sans('vendredi', 67, 'Flash maths'), sans('vendredi', 68, 'Mathématiques'), sans('vendredi', 69, 'Problème'),
    sans('vendredi', 70, 'Calcul mental'), sans('vendredi', 82, 'EMC'), sans('vendredi', 85, 'Arts plastiques'),
  ]
  const IDENTITE = "EMC/EVARS/PHARE : L'identité"
  const S1 = [
    notions('maths', [NUMERATION, PROBLEMES, CALCUL]),
    notions('emc', [HISTOIRE, GEOGRAPHIE, IDENTITE]),
    notions('arts', [POESIE, ARTS_PLASTIQUES]),
    notions('eps', ['Activités : Course longue']),
  ]
  const S2 = [S1[0], notions('emc', [HISTOIRE, IDENTITE]), S1[2], S1[3]]

  it('semaine 1 (nouveau poème) : chaque case reçoit ce qu’elle nomme', () => {
    const [lundi, vendredi] = genererCahierJournal(EDT, S1, [])
    expect(dans(lundi, 'Mathématiques')).toBe(lignes(NUMERATION, PROBLEMES))
    expect(dans(lundi, 'Calcul mental')).toBe(CALCUL)
    expect(dans(lundi, 'Flash maths')).toBe('Flash maths')
    expect(dans(lundi, 'EPS')).toBe('Activités : Course longue')
    expect(dans(lundi, 'Histoire, géographie, sciences et technologie')).toBe(lignes(HISTOIRE, GEOGRAPHIE))
    expect(dans(lundi, 'EMC / Poésie')).toBe(POESIE)
    expect(dans(vendredi, 'Problème')).toBe(PROBLEMES)
    expect(dans(vendredi, 'EMC')).toBe(lignes(HISTOIRE, GEOGRAPHIE, IDENTITE))
    expect(dans(vendredi, 'Arts plastiques')).toBe(ARTS_PLASTIQUES)
    expect(lundi.aPlacer ?? []).toEqual([])
  })

  it('semaine 2 (le poème continue) : le lundi « EMC / Poésie » montre l’EMC', () => {
    const [lundi] = genererCahierJournal(EDT, S2, S1)
    expect(dans(lundi, 'EMC / Poésie')).toBe(IDENTITE)
    expect(lundi.aPlacer ?? []).toEqual([])
  })
})
