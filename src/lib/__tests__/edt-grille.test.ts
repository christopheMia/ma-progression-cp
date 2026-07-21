import {
  frontieres,
  lignesGrille,
  construireGrille,
  creneauxDeLaLigne,
  type CreneauMin,
} from '../edt-grille'

const c = (jour: string, heure_debut: string, heure_fin: string, matiere = ''): CreneauMin & { matiere: string } =>
  ({ jour, heure_debut, heure_fin, matiere })

/**
 * Le cas signale par Christophe : lundi pose une seance de 30 min pendant que
 * les autres jours decoupent la meme demi-heure plus finement.
 */
const CAS_11H = [
  c('lundi', '11:00', '11:30', 'Calcul mental'),
  c('mardi', '11:00', '11:10', 'Calcul mental'),
  c('mardi', '11:10', '11:20', 'Musique'),
  c('mardi', '11:20', '11:30', 'Rangement'),
]
const JOURS = ['lundi', 'mardi']

describe('frontieres et lignes', () => {
  test('les frontieres sont les debuts et fins distincts, tries', () => {
    expect(frontieres(CAS_11H)).toEqual(['11:00', '11:10', '11:20', '11:30'])
  })

  test('les lignes sont les intervalles entre frontieres consecutives', () => {
    expect(lignesGrille(CAS_11H)).toEqual([
      { debut: '11:00', fin: '11:10' },
      { debut: '11:10', fin: '11:20' },
      { debut: '11:20', fin: '11:30' },
    ])
  })

  test('l\'ancien modele produisait plus de lignes que le nouveau', () => {
    // Ancien : un couple (debut, fin) distinct par seance, soit 4 lignes ici.
    const couples = new Set(CAS_11H.map(x => `${x.heure_debut}-${x.heure_fin}`))
    expect(couples.size).toBe(4)
    expect(lignesGrille(CAS_11H)).toHaveLength(3)
  })
})

describe('construireGrille', () => {
  test('une seance longue est rendue une seule fois, sur toute sa hauteur', () => {
    const { cases } = construireGrille(CAS_11H, JOURS)

    // Lundi : la seance demarre en ligne 0 et couvre les 3 lignes.
    expect(cases[0][0]).toMatchObject({ etat: 'seance', span: 3 })
    expect(cases[1][0]).toEqual({ etat: 'couverte' })
    expect(cases[2][0]).toEqual({ etat: 'couverte' })
  })

  test('les seances courtes gardent chacune leur ligne', () => {
    const { cases } = construireGrille(CAS_11H, JOURS)
    for (let i = 0; i < 3; i++) {
      expect(cases[i][1]).toMatchObject({ etat: 'seance', span: 1 })
    }
  })

  test('aucune fausse case vide : plus rien n\'est « libre » ici', () => {
    const { cases } = construireGrille(CAS_11H, JOURS)
    const libres = cases.flat().filter(x => x.etat === 'libre')
    expect(libres).toHaveLength(0)
  })

  test('un vrai trou reste libre', () => {
    const avecTrou = [
      c('lundi', '09:00', '09:30', 'Maths'),
      c('mardi', '09:00', '09:30', 'Maths'),
      c('mardi', '09:30', '10:00', 'EPS'),
    ]
    const { cases, lignes } = construireGrille(avecTrou, JOURS)
    const iTrou = lignes.findIndex(l => l.debut === '09:30')
    expect(cases[iTrou][0]).toEqual({ etat: 'libre' }) // lundi n'a rien de 9h30 a 10h
    expect(cases[iTrou][1]).toMatchObject({ etat: 'seance' })
  })

  test('le nombre de <td> emis par ligne est coherent avec les rowSpan', () => {
    const { cases } = construireGrille(CAS_11H, JOURS)
    // Ligne 0 : lundi (span 3) + mardi = 2 cellules.
    // Lignes 1 et 2 : lundi est couverte, donc 1 seule cellule.
    const emises = cases.map(l => l.filter(x => x.etat !== 'couverte').length)
    expect(emises).toEqual([2, 1, 1])
  })

  test('une journee entiere se reconstitue sans trou ni chevauchement', () => {
    const journee = [
      c('lundi', '08:30', '08:45', 'Rituels'),
      c('lundi', '08:45', '10:00', 'Etude du code'),
      c('lundi', '10:00', '10:15', 'Recreation'),
    ]
    const { cases, lignes } = construireGrille(journee, ['lundi'])
    const spans = cases
      .map(l => l[0])
      .filter(x => x.etat === 'seance')
      .reduce((n, x) => n + (x.etat === 'seance' ? x.span : 0), 0)
    expect(spans).toBe(lignes.length)
  })

  test('des seances qui se chevauchent ne decalent pas la colonne', () => {
    const incoherent = [
      c('lundi', '09:00', '10:00', 'Maths'),
      c('lundi', '09:30', '10:00', 'EPS'), // chevauche la precedente
    ]
    const { cases } = construireGrille(incoherent, ['lundi'])
    const seances = cases.flat().filter(x => x.etat === 'seance')
    expect(seances).toHaveLength(1) // la seconde est ignoree, pas empilee
  })

  test('une grille vide ne casse pas', () => {
    expect(construireGrille([], JOURS)).toEqual({ lignes: [], cases: [] })
  })
})

describe('creneauxDeLaLigne', () => {
  test('sur une ligne uniforme, retrouve tous les jours (ancien comportement)', () => {
    const recre = [
      c('lundi', '10:00', '10:15', 'Recreation'),
      c('mardi', '10:00', '10:15', 'Recreation'),
    ]
    expect(creneauxDeLaLigne(recre, { debut: '10:00', fin: '10:15' })).toHaveLength(2)
  })

  test('retient une seance qui traverse la ligne sans y commencer', () => {
    const trouves = creneauxDeLaLigne(CAS_11H, { debut: '11:10', fin: '11:20' })
    const matieres = trouves.map(x => x.matiere).sort()
    expect(matieres).toEqual(['Calcul mental', 'Musique']) // le long du lundi + le court du mardi
  })

  test('ignore une seance qui ne fait que toucher la borne', () => {
    const trouves = creneauxDeLaLigne(
      [c('lundi', '09:00', '10:00', 'Maths')],
      { debut: '10:00', fin: '10:15' },
    )
    expect(trouves).toHaveLength(0)
  })
})
