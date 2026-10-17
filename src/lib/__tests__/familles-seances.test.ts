import { famillesCreneau, famillesSeance, repartirSeances } from '../familles-seances'
import type { SeanceProgression } from '@/types'

const s = (libelle: string, domaine = ''): SeanceProgression => ({ jour: 1, domaine, libelle })

describe('famillesSeance, sur les séances réelles de Cécile', () => {
  it.each([
    ['Graphèmes e et é (phono, lecture)', ['phonologie']],
    ['Graphème L (phono, encodage, décodage)', ['phonologie']],
    ['Graphème S = Z (déc-enc)', ['phonologie']],
    ['Vocabulaire (S7)', ['etudeLangue']],
    ['Grammaire (S8)', ['etudeLangue']],
    ['Geste d’écriture', ['ecriture']],
    ['LC : Texte au choix', ['comprehension']],
    ['LC Le sais-tu ? Les nids', ['comprehension']],
    ['PDE (S5)', ['productionEcrits']],
    ['Langage oral : Voyelles de Rimbaud (S4)', ['langageOral']],
  ])('%s', (libelle, attendu) => {
    expect(famillesSeance(libelle)).toEqual(attendu)
  })

  it('« (phono, lecture) » ne compte pas comme de la compréhension', () => {
    expect(famillesSeance('Graphèmes e et é (phono, lecture)')).not.toContain('comprehension')
  })

  it('« lecture » seule ne décide de rien', () => {
    expect(famillesSeance('Lecture offerte')).toEqual([])
  })

  it('« Vocabulaire et PDE (S8) » porte deux familles', () => {
    expect(famillesSeance('Vocabulaire et PDE (S8)')).toEqual(['etudeLangue', 'productionEcrits'])
  })

  it('ne reconnaît LC et PDE que comme mots entiers', () => {
    expect(famillesSeance('Calcul')).toEqual([])
    expect(famillesSeance('Pdetest')).toEqual([])
  })

  // Christophe, 17/10 : ces séances n'ont pas de créneau chez Cécile et restent
  // à placer. Aucune famille ne doit les capter.
  it.each([
    ['Fluence (S3)'],
    ['Lettres muettes E, S, T, H...'],
    ['Les prénoms de la classe (alphabet)'],
  ])('ne devine rien pour %s', libelle => {
    expect(famillesSeance(libelle)).toEqual([])
  })

  describe('écriture : le geste seulement, rien de plus large', () => {
    it.each([
      ['Écriture'],
      ['Ecriture (S2)'],
      ['Geste d’écriture'],
      ['Graphisme : les boucles'],
      ['Copie de la date'],
    ])('%s est de l’écriture', libelle => {
      expect(famillesSeance(libelle)).toEqual(['ecriture'])
    })

    it.each([
      ['Écriture d’une phrase'],
      ['Lecture et écriture de syllabes'],
    ])('%s ne va pas dans « Ecriture »', libelle => {
      expect(famillesSeance(libelle)).not.toContain('ecriture')
    })
  })

  it('« Lecture orale » n’est pas du langage oral', () => {
    expect(famillesSeance('Lecture orale')).toEqual([])
  })

  it('« Compréhension orale » n’est pas de la compréhension écrite', () => {
    expect(famillesSeance('Compréhension orale (S1)')).toEqual([])
  })

  it('tient compte du domaine', () => {
    expect(famillesSeance('La petite poule (S1)', 'LC')).toEqual(['comprehension'])
  })
})

describe('famillesCreneau, sur les créneaux réels de Cécile', () => {
  it.each([
    ['Phonologie encodage décodage', ['phonologie']],
    ['Etude de la langue : vocabulaire ou grammaire', ['etudeLangue']],
    ['Ecriture', ['ecriture']],
    ['Compréhension écrite', ['comprehension']],
    ["Production d'écrits", ['productionEcrits']],
    ["Compréhension écrite ou production d'cérits", ['comprehension', 'productionEcrits']],
    ["Compréhension d'écrits ou production d'écrits", ['comprehension', 'productionEcrits']],
    ["Compréhension d'cérits ou production d'écrits", ['comprehension', 'productionEcrits']],
    ['Ateliers de français', []],
    ['Chut, je lis.', []],
    ['Lecture-écriture', []],
  ])('%s', (nom, attendu) => {
    expect(famillesCreneau(nom)).toEqual(attendu)
  })

  it('« Production orale » n’accueille pas la PDE', () => {
    expect(famillesCreneau('Production orale')).toEqual([])
  })

  it('« Compréhension orale » n’accueille pas la LC', () => {
    expect(famillesCreneau('Compréhension orale')).toEqual([])
  })

  it('« Compréhension orale ou production d’écrits » n’accueille que la PDE', () => {
    expect(famillesCreneau('Compréhension orale ou production d’écrits')).toEqual(['productionEcrits'])
  })
})

describe('repartirSeances', () => {
  const jamaisGenerique = () => false
  const libelles = (x: (SeanceProgression | null)[]) => x.map(y => y?.libelle ?? null)

  it('deux créneaux du même nom prennent les séances de leur famille dans l’ordre', () => {
    const { parCreneau, restantes } = repartirSeances(
      ['Etude de la langue', 'Etude de la langue'],
      [s('Vocabulaire (S7)'), s('Grammaire (S8)')],
      jamaisGenerique,
    )
    expect(libelles(parCreneau)).toEqual(['Vocabulaire (S7)', 'Grammaire (S8)'])
    expect(restantes).toEqual([])
  })

  it('deux créneaux de noms différents pour une même famille : rien n’est deviné', () => {
    const { parCreneau, restantes } = repartirSeances(
      ['Compréhension écrite', "Compréhension d'écrits ou production d'écrits"],
      [s('LC : Texte au choix'), s('PDE (S5)')],
      jamaisGenerique,
    )
    // La PDE n'a qu'un créneau possible ; la LC en a deux, elle reste à placer.
    expect(libelles(parCreneau)).toEqual([null, 'PDE (S5)'])
    expect(restantes.map(x => x.libelle)).toEqual(['LC : Texte au choix'])
  })

  it('une séance ambiguë ne glisse jamais dans le créneau générique', () => {
    const { parCreneau, restantes } = repartirSeances(
      ['Français', 'Compréhension écrite', "Compréhension ou production d'écrits"],
      [s('LC : Texte')],
      nom => nom === 'Français',
    )
    expect(libelles(parCreneau)).toEqual([null, null, null])
    expect(restantes.map(x => x.libelle)).toEqual(['LC : Texte'])
  })

  it('le créneau qui écrit le mot de la séance l’emporte', () => {
    const { parCreneau, restantes } = repartirSeances(
      ['Appropriation des graphèmes', 'Phonologie'],
      [s('Graphème L (phono, encodage, décodage)'), s('Phonologie : le son [l]')],
      jamaisGenerique,
    )
    expect(libelles(parCreneau))
      .toEqual(['Graphème L (phono, encodage, décodage)', 'Phonologie : le son [l]'])
    expect(restantes).toEqual([])
  })

  it('un créneau générique reçoit dans l’ordre ce que les familles n’ont pas placé', () => {
    const { parCreneau, restantes } = repartirSeances(
      ['Français', 'Ecriture', 'Français'],
      [s('Vocabulaire et PDE (S8)'), s('Geste d’écriture'), s('Fluence (S3)')],
      nom => nom === 'Français',
    )
    expect(libelles(parCreneau)).toEqual(['Vocabulaire et PDE (S8)', 'Geste d’écriture', 'Fluence (S3)'])
    expect(restantes).toEqual([])
  })

  it('le créneau générique reçoit aussi une séance dont le seul créneau est déjà pris', () => {
    const { parCreneau, restantes } = repartirSeances(
      ['Ecriture', 'Français'],
      [s('Geste d’écriture'), s('Graphisme : les boucles')],
      nom => nom === 'Français',
    )
    expect(libelles(parCreneau)).toEqual(['Geste d’écriture', 'Graphisme : les boucles'])
    expect(restantes).toEqual([])
  })

  it('rend les restantes dans l’ordre du document', () => {
    const { restantes } = repartirSeances(
      ['Compréhension écrite', 'Compréhension ou production d’écrits'],
      [s('Fluence (S3)'), s('LC : Texte'), s('Lettres muettes')],
      jamaisGenerique,
    )
    expect(restantes.map(x => x.libelle)).toEqual(['Fluence (S3)', 'LC : Texte', 'Lettres muettes'])
  })
})
