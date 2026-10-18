import {
  cleType, indexerRegles, regleDeSeance, regleDeNotion, estCaseDeRegle, lireRegles,
} from '../regles-rangement'
import type { CreneauHoraire, SeanceProgression } from '@/types'

const regle = (type: string, creneau: string, jour: CreneauHoraire['jour'] | null = null) =>
  ({ type, creneau, jour })

const seance = (libelle: string, domaine = '', jour: number | null = null): SeanceProgression =>
  ({ jour, domaine, libelle })

const c = (matiere: string, type: 'cours' | 'routine' = 'cours'): CreneauHoraire => ({
  id: matiere, class_id: 'classe', jour: 'jeudi', heure_debut: '08:00', heure_fin: '08:30',
  matiere, ordre: 0, couleur: null, type, methode_id: null, visible_journal: true,
})

describe('cleType', () => {
  it('compare sans accents, sans majuscules, sans la marque du pluriel', () => {
    expect(cleType('Écoute musicale')).toBe(cleType('ecoute musicales'))
    expect(cleType('Chants')).toBe('chant')
  })
  it('reconnaît la forme longue d’une abréviation de Cécile', () => {
    expect(cleType('Lecture compréhension')).toBe(cleType('LC'))
  })
  it('un type vide n’a pas de clé', () => {
    expect(cleType('   ')).toBe('')
  })
})

describe('quelle règle', () => {
  const index = indexerRegles([regle('Chant', 'Musique', 'jeudi'), regle('Fluence', 'Ateliers de français')])

  it('une séance relève de la règle de son domaine', () => {
    expect(regleDeSeance(seance('Chant : L’Europe', 'Chant'), index)?.creneau).toBe('Musique')
  })
  it('sans domaine rempli, le texte avant les deux points fait foi', () => {
    expect(regleDeSeance(seance('Fluence : texte 1'), index)?.creneau).toBe('Ateliers de français')
  })
  it('une séance sans type ne relève d’aucune règle', () => {
    expect(regleDeSeance(seance('Les prénoms de la classe'), index)).toBeUndefined()
  })
  it('une notion relève de la règle du premier de ses domaines qui en a une', () => {
    const index2 = indexerRegles([regle('EVARS', 'APC')])
    expect(regleDeNotion('EMC/EVARS/PHARE : Les familles', index2)?.creneau).toBe('APC')
    expect(regleDeNotion('Chant : L’Europe', index)?.jour).toBe('jeudi')
    expect(regleDeNotion('Numération : 5', index)).toBeUndefined()
  })
  it('un carnet vide ne donne aucune règle', () => {
    expect(regleDeSeance(seance('Chant : X', 'Chant'), indexerRegles([]))).toBeUndefined()
  })
})

describe('estCaseDeRegle', () => {
  it('compare le nom de la case sans accents ni majuscules', () => {
    expect(estCaseDeRegle(c('ateliers de francais'), regle('Fluence', 'Ateliers de français'))).toBe(true)
  })
  it('une routine n’est jamais la case d’une règle', () => {
    expect(estCaseDeRegle(c('Musique', 'routine'), regle('Chant', 'Musique'))).toBe(false)
  })
})

describe('lireRegles', () => {
  it('garde les lignes bien formées, écarte le reste', () => {
    expect(lireRegles([
      { type: 'Chant', creneau: 'Musique', jour: 'jeudi' },
      { type: 'Fluence', creneau: 'APC', jour: null },
      { type: 'Danse', creneau: 'EPS', jour: 'samedi' },
      { type: '', creneau: 'EPS', jour: null },
      null,
    ])).toEqual([
      { type: 'Chant', creneau: 'Musique', jour: 'jeudi' },
      { type: 'Fluence', creneau: 'APC', jour: null },
      { type: 'Danse', creneau: 'EPS', jour: null },
    ])
    expect(lireRegles(null)).toEqual([])
  })
})
