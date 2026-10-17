import { normalizeProgression } from '../schema'

/**
 * Semaine 1 du planning réel « La petite poule qui voulait voir la mer »
 * (partage/exemple de planning p1.pdf) : 3 puces au jour 1, 2 au jour 2,
 * 4 au jour 3, 3 au jour 4.
 */
const SEMAINE_1 = [{
  numero: 1, items: [], pages: '', mots_exemple: [],
  seances: [
    { jour: 1, domaine: 'Lecture compréhension', libelle: 'Lecture compréhension : La petite poule qui voulait voir la mer (séance 1)' },
    { jour: 1, domaine: '', libelle: 'Les prénoms de la classe (les lettres de l’alphabet)' },
    { jour: 1, domaine: '', libelle: 'Geste d’écriture' },
    { jour: 2, domaine: 'LC', libelle: 'LC : La petite poule qui voulait voir la mer (séance 2)' },
    { jour: 2, domaine: '', libelle: 'Les prénoms de la classe (le nombre de lettres)' },
    { jour: 3, domaine: 'LC', libelle: 'LC : La petite poule qui voulait voir la mer (séance 3)' },
    { jour: 3, domaine: 'Vocabulaire', libelle: 'Vocabulaire (séance 1)' },
    { jour: 3, domaine: '', libelle: 'Les prénoms de la classe (le nombre de syllabes)' },
    { jour: 3, domaine: '', libelle: 'Geste d’écriture' },
    { jour: 4, domaine: 'LC', libelle: 'LC : La petite poule qui voulait voir la mer (séance 4)' },
    { jour: 4, domaine: 'Vocabulaire', libelle: 'Vocabulaire (séance 2)' },
    { jour: 4, domaine: 'Langage oral', libelle: 'Langage oral : Voyelles, de Rimbaud (séance 1)' },
  ],
}]

describe('planning Petites Poules, semaine 1', () => {
  const [semaine] = normalizeProgression(SEMAINE_1)

  it('garde les douze séances', () => {
    expect(semaine.seances).toHaveLength(12)
  })

  it('compte les séances de chaque jour comme le document', () => {
    const parJour = (n: number) => semaine.seances?.filter(s => s.jour === n).length
    expect([parJour(1), parJour(2), parJour(3), parJour(4)]).toEqual([3, 2, 4, 3])
  })

  it('ne prend jamais le « (séance N) » du libellé pour un numéro de jour', () => {
    const vocabulaire = semaine.seances?.find(s => s.libelle === 'Vocabulaire (séance 2)')
    expect(vocabulaire?.jour).toBe(4)
  })

  // Décision de Cécile (09/09) : « tu peux laisser LC tout le temps ».
  it('écrit LC partout, même quand le document dit « Lecture compréhension »', () => {
    const lectures = semaine.seances?.filter(s => /petite poule/i.test(s.libelle)) ?? []
    expect(lectures).toHaveLength(4)
    expect(lectures.every(s => s.libelle.startsWith('LC : '))).toBe(true)
  })
})
