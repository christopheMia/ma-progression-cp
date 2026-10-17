import { famillesDe, repartirSeances } from '../familles-seances'
import type { SeanceProgression } from '@/types'

const s = (libelle: string, domaine = ''): SeanceProgression => ({ jour: 1, domaine, libelle })

describe('famillesDe, sur les séances réelles de Cécile', () => {
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
    expect(famillesDe(libelle)).toEqual(attendu)
  })

  it('« (phono, lecture) » ne compte pas comme de la compréhension', () => {
    expect(famillesDe('Graphèmes e et é (phono, lecture)')).not.toContain('comprehension')
  })

  it('« lecture » seule ne décide de rien', () => {
    expect(famillesDe('Lecture offerte')).toEqual([])
  })

  it('« Vocabulaire et PDE (S8) » porte deux familles', () => {
    expect(famillesDe('Vocabulaire et PDE (S8)')).toEqual(['etudeLangue', 'productionEcrits'])
  })

  it('ne reconnaît LC et PDE que comme mots entiers', () => {
    expect(famillesDe('Calcul')).toEqual([])
    expect(famillesDe('Pdetest')).toEqual([])
  })

  it.each([
    ['Fluence (S3)'],
    ['Lettres muettes E, S, T, H...'],
    ['Les prénoms de la classe (alphabet)'],
  ])('ne devine rien pour %s', libelle => {
    expect(famillesDe(libelle)).toEqual([])
  })
})

describe('famillesDe, sur les créneaux réels de Cécile', () => {
  it.each([
    ['Phonologie encodage décodage', ['phonologie']],
    ['Etude de la langue : vocabulaire ou grammaire', ['etudeLangue']],
    ['Ecriture', ['ecriture']],
    ['Compréhension écrite', ['comprehension']],
    ["Production d'écrits", ['productionEcrits']],
    ["Compréhension écrite ou production d'cérits", ['comprehension', 'productionEcrits']],
    ["Compréhension d'écrits ou production d'écrits", ['comprehension', 'productionEcrits']],
    ['Ateliers de français', []],
    ['Chut, je lis.', []],
    ['Lecture-écriture', []],
  ])('%s', (nom, attendu) => {
    expect(famillesDe(nom)).toEqual(attendu)
  })
})

describe('repartirSeances', () => {
  const jamaisGenerique = () => false

  it('deux créneaux du même nom prennent les séances de leur famille dans l’ordre', () => {
    const { parCreneau, restantes } = repartirSeances(
      ['Etude de la langue', 'Etude de la langue'],
      [s('Vocabulaire (S7)'), s('Grammaire (S8)')],
      jamaisGenerique,
    )
    expect(parCreneau.map(x => x?.libelle ?? null)).toEqual(['Vocabulaire (S7)', 'Grammaire (S8)'])
    expect(restantes).toEqual([])
  })

  it('deux créneaux de noms différents pour une même famille : rien n’est deviné', () => {
    const { parCreneau, restantes } = repartirSeances(
      ['Compréhension écrite', "Compréhension d'écrits ou production d'écrits"],
      [s('LC : Texte au choix'), s('PDE (S5)')],
      jamaisGenerique,
    )
    // La PDE n'a qu'un créneau possible ; la LC en a deux, elle reste à placer.
    expect(parCreneau.map(x => x?.libelle ?? null)).toEqual([null, 'PDE (S5)'])
    expect(restantes.map(x => x.libelle)).toEqual(['LC : Texte au choix'])
  })

  it('un créneau générique reçoit dans l’ordre ce que les familles n’ont pas placé', () => {
    const { parCreneau, restantes } = repartirSeances(
      ['Français', 'Ecriture', 'Français'],
      [s('Vocabulaire et PDE (S8)'), s('Geste d’écriture'), s('Fluence (S3)')],
      nom => nom === 'Français',
    )
    expect(parCreneau.map(x => x?.libelle ?? null))
      .toEqual(['Vocabulaire et PDE (S8)', 'Geste d’écriture', 'Fluence (S3)'])
    expect(restantes).toEqual([])
  })

  it('tient compte du domaine quand le libellé ne le porte pas', () => {
    const { parCreneau } = repartirSeances(
      ['Compréhension écrite'], [s('La petite poule (S1)', 'LC')], jamaisGenerique,
    )
    expect(parCreneau[0]?.libelle).toBe('La petite poule (S1)')
  })
})
