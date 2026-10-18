import { genererCahierJournal } from '../cahier-journal'
import type { CreneauHoraire, JourJournal, ProgressionMatiere, SeanceProgression } from '@/types'
import type { RegleAppliquee } from '../regles-rangement'

/**
 * Le carnet de rangement dans le cahier journal (conception du 18/10/2026).
 * Cases inspirées du vrai emploi du temps de Cécile (aucune reliée à une
 * méthode) ; sa case « Musique » est le jeudi, la classe de test en a une le
 * mardi : on garde les deux pour voir le jour préféré.
 */
type Jour = CreneauHoraire['jour']
const c = (jour: Jour, ordre: number, matiere: string, type: 'cours' | 'routine' = 'cours'): CreneauHoraire => ({
  id: `${jour}-${ordre}`, class_id: 'classe', jour, heure_debut: '08:00', heure_fin: '08:30',
  matiere, ordre, couleur: null, type, methode_id: null, visible_journal: true,
})
const EDT: CreneauHoraire[] = [
  c('lundi', 3, 'Phonologie encodage décodage'), c('lundi', 4, 'Ateliers de français'), c('lundi', 9, 'Mathématiques'),
  c('mardi', 3, 'Phonologie encodage décodage'), c('mardi', 4, 'Ateliers de français'), c('mardi', 13, 'Musique'),
  c('jeudi', 3, 'Phonologie encodage décodage'), c('jeudi', 4, 'Ateliers de français'),
  c('jeudi', 13, 'Musique'), c('jeudi', 15, 'Arts plastiques'),
  c('vendredi', 3, 'Phonologie encodage décodage'), c('vendredi', 4, 'Ateliers de français'), c('vendredi', 5, 'APC'),
]

// Domaine vide, comme les 715 séances de Cécile remplies par 028 : le type se
// lit devant les deux points, et le libellé ressort intact de `lireSeances`.
const PHONO: SeanceProgression = { jour: 1, domaine: '', libelle: 'Phonologie : le son a' }
const FLUENCE_MARDI: SeanceProgression = { jour: 2, domaine: '', libelle: 'Fluence : texte 1' }
const FLUENCE_SANS_JOUR: SeanceProgression = { jour: null, domaine: '', libelle: 'Fluence : texte 2' }
const CHANT = 'Chant : L’Europe'
const ARTS = 'Arts plastiques : Dessiner la tour Eiffel'

const PROGRESSION: ProgressionMatiere[] = [
  { methode_id: null, matiere: 'francais', items: [], pages: null, mots_exemple: [],
    seances: [PHONO, FLUENCE_MARDI, FLUENCE_SANS_JOUR] },
  { methode_id: null, matiere: 'arts', items: [CHANT, ARTS], pages: null, mots_exemple: [] },
  { methode_id: null, matiere: 'maths', items: ['Numération : 5'], pages: null, mots_exemple: [] },
]

const regle = (type: string, creneau: string, jour: Jour | null = null): RegleAppliquee => ({ type, creneau, jour })
const jour = (j: JourJournal[], nom: Jour) => j.find(x => x.jour === nom)!
const dans = (j: JourJournal, nom: string) => j.seances.find(s => s.matiere === nom)!.deroulement
const aPlacer = (j: JourJournal[]) => j.flatMap(x => (x.aPlacer ?? []).map(a => `${x.jour}:${a.libelle}`))

describe('carnet vide : cahier journal identique', () => {
  it('sans règle, avec un carnet vide ou des règles hors sujet, le résultat est le même', () => {
    const sans = genererCahierJournal(EDT, PROGRESSION)
    expect(genererCahierJournal(EDT, PROGRESSION, undefined, [])).toEqual(sans)
    expect(genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Danse', 'EPS')])).toEqual(sans)
  })
  it('sans carnet, la fluence et le chant partent à placer (le constat du 18/10)', () => {
    const j = genererCahierJournal(EDT, PROGRESSION)
    expect(aPlacer(j)).toEqual(expect.arrayContaining(['mardi:Fluence : texte 1', 'lundi:Fluence : texte 2', `lundi:${CHANT}`]))
  })
})

describe('les notions', () => {
  it('« Chant vers Musique » : le chant paraît dans chaque case Musique de la semaine', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Chant', 'Musique')])
    expect(dans(jour(j, 'mardi'), 'Musique')).toBe(CHANT)
    expect(dans(jour(j, 'jeudi'), 'Musique')).toBe(CHANT)
    expect(aPlacer(j)).not.toContain(`lundi:${CHANT}`)
  })
  it('avec un jour préféré, seulement ce jour-là', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Chant', 'Musique', 'jeudi')])
    expect(dans(jour(j, 'jeudi'), 'Musique')).toBe(CHANT)
    expect(dans(jour(j, 'mardi'), 'Musique')).toBe('Musique')
  })
  it('une règle vers une case qui n’existe pas envoie la notion à placer, une fois', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Chant', 'Éveil musical')])
    expect(aPlacer(j).filter(x => x.endsWith(CHANT))).toEqual([`lundi:${CHANT}`])
  })
  it('les autres notions gardent leur place', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Chant', 'Musique')])
    expect(dans(jour(j, 'jeudi'), 'Arts plastiques')).toBe(ARTS)
  })
})

describe('les séances', () => {
  it('séance datée : la case de la règle, le jour du document', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Fluence', 'Ateliers de français', 'vendredi')])
    expect(dans(jour(j, 'mardi'), 'Ateliers de français')).toBe('Fluence : texte 1')
  })
  it('séance sans jour : le jour préféré de la règle', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Fluence', 'Ateliers de français', 'vendredi')])
    expect(dans(jour(j, 'vendredi'), 'Ateliers de français')).toBe('Fluence : texte 2')
    expect(aPlacer(j)).not.toContain('lundi:Fluence : texte 2')
  })
  it('séance sans jour, règle sans jour : le premier jour qui a la case, une seule fois', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Fluence', 'Ateliers de français')])
    expect(dans(jour(j, 'lundi'), 'Ateliers de français')).toBe('Fluence : texte 2')
    expect(j.filter(x => dans(x, 'Ateliers de français') === 'Fluence : texte 2')).toHaveLength(1)
  })
  it('case de la règle absente ce jour-là : à placer', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Fluence', 'APC')])
    expect(aPlacer(j)).toContain('mardi:Fluence : texte 1')
    expect(dans(jour(j, 'vendredi'), 'APC')).toBe('Fluence : texte 2')
    expect(dans(jour(j, 'mardi'), 'Ateliers de français')).not.toContain('Fluence : texte 1')
  })
  it('la règle passe en premier : elle prend la case, la séance à son nom part à placer', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Fluence', 'Phonologie encodage décodage')])
    expect(dans(jour(j, 'lundi'), 'Phonologie encodage décodage')).toBe('Fluence : texte 2')
    expect(aPlacer(j)).toContain('lundi:Phonologie : le son a')
  })
  it('la phonologie sans règle reste à sa place', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Fluence', 'Ateliers de français')])
    expect(dans(jour(j, 'lundi'), 'Phonologie encodage décodage')).toBe('Phonologie : le son a')
  })
})

const fr = (seances: SeanceProgression[], items: string[] = []): ProgressionMatiere =>
  ({ methode_id: null, matiere: 'francais', items, pages: null, mots_exemple: [], seances })
const arts = (items: string[]): ProgressionMatiere =>
  ({ methode_id: null, matiere: 'arts', items, pages: null, mots_exemple: [] })
const FLU = (jourDuDoc: number | null, n: number): SeanceProgression =>
  ({ jour: jourDuDoc, domaine: '', libelle: `Fluence : texte ${n}` })

describe('une séance datée l’emporte sur une séance sans jour (F1)', () => {
  it('la séance du lundi garde la case du lundi, la séance sans jour prend le mardi', () => {
    const j = genererCahierJournal(EDT, [fr([FLU(null, 2), FLU(1, 1)])], undefined, [regle('Fluence', 'Ateliers de français')])
    expect(dans(jour(j, 'lundi'), 'Ateliers de français')).toBe('Fluence : texte 1')
    expect(dans(jour(j, 'mardi'), 'Ateliers de français')).toBe('Fluence : texte 2')
    expect(aPlacer(j)).toEqual([])
  })
  it('la séance sans jour reste rangée une seule fois, ordre du document inversé', () => {
    const j = genererCahierJournal(EDT, [fr([FLU(1, 1), FLU(null, 2)])], undefined, [regle('Fluence', 'Ateliers de français')])
    expect(dans(jour(j, 'lundi'), 'Ateliers de français')).toBe('Fluence : texte 1')
    expect(dans(jour(j, 'mardi'), 'Ateliers de français')).toBe('Fluence : texte 2')
    expect(aPlacer(j)).toEqual([])
  })
  it('toutes les cases prises : la séance sans jour retombe sur le premier jour qui a la case, à placer', () => {
    const j = genererCahierJournal(EDT, [fr([FLU(1, 1), FLU(2, 3), FLU(3, 4), FLU(4, 5), FLU(null, 2)])], undefined,
      [regle('Fluence', 'Ateliers de français')])
    expect(aPlacer(j)).toEqual(['lundi:Fluence : texte 2'])
  })
})

describe('le jour préféré sans la case (F3)', () => {
  const SANS_MUSIQUE_MARDI = EDT.filter(x => !(x.jour === 'mardi' && x.matiere === 'Musique'))
  it('une notion va dans la première case de la semaine', () => {
    const j = genererCahierJournal(SANS_MUSIQUE_MARDI, PROGRESSION, undefined, [regle('Chant', 'Musique', 'mardi')])
    expect(dans(jour(j, 'jeudi'), 'Musique')).toBe(CHANT)
    expect(aPlacer(j)).not.toContain(`lundi:${CHANT}`)
  })
  it('une séance sans jour aussi', () => {
    const j = genererCahierJournal(SANS_MUSIQUE_MARDI, PROGRESSION, undefined, [regle('Fluence', 'Musique', 'mardi')])
    expect(dans(jour(j, 'jeudi'), 'Musique')).toBe('Fluence : texte 2')
    expect(aPlacer(j)).not.toContain('lundi:Fluence : texte 2')
  })
  it('un jour préféré qui n’est pas un jour d’école (mercredi) : la séance sans jour est rangée une fois', () => {
    const j = genererCahierJournal(EDT, [fr([FLU(null, 2), FLU(2, 1)])], undefined, [regle('Fluence', 'Ateliers de français', 'mercredi')])
    expect(dans(jour(j, 'lundi'), 'Ateliers de français')).toBe('Fluence : texte 2')
    expect(j.filter(x => dans(x, 'Ateliers de français') === 'Fluence : texte 2')).toHaveLength(1)
    expect(aPlacer(j)).toEqual([])
  })
  it('une notion avec un jour préféré qui n’est pas un jour d’école : la première case de la semaine', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Chant', 'Musique', 'mercredi')])
    expect(dans(jour(j, 'mardi'), 'Musique')).toBe(CHANT)
    expect(dans(jour(j, 'jeudi'), 'Musique')).toBe('Musique')
  })
})

describe('le jour préféré doit avoir une case libre (M1)', () => {
  it('le mardi est pris par une séance datée, le lundi est libre : la séance sans jour va au lundi', () => {
    const j = genererCahierJournal(EDT, [fr([FLU(2, 1), FLU(null, 2)])], undefined,
      [regle('Fluence', 'Ateliers de français', 'mardi')])
    expect(dans(jour(j, 'mardi'), 'Ateliers de français')).toBe('Fluence : texte 1')
    expect(dans(jour(j, 'lundi'), 'Ateliers de français')).toBe('Fluence : texte 2')
    expect(aPlacer(j)).toEqual([])
  })
})

describe('une notion du carnet dans une case qui montre déjà autre chose (F2)', () => {
  it('case nourrie par une séance datée : séance, puis notion', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Chant', 'Phonologie encodage décodage')])
    expect(dans(jour(j, 'lundi'), 'Phonologie encodage décodage')).toBe(`Phonologie : le son a
${CHANT}`)
  })
  it('case nourrie par une séance datée, aucune séance ce jour-là : la notion seule', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Chant', 'Phonologie encodage décodage')])
    expect(dans(jour(j, 'jeudi'), 'Phonologie encodage décodage')).toBe(CHANT)
  })
  it('case de l’ancien remplissage (Jour N) : les lignes du jour, puis la notion', () => {
    const edt = [c('lundi', 1, 'Français'), c('mardi', 1, 'Français')]
    const prog = [fr([], ['Jour 1 : Lecture p. 3', 'Jour 2 : Dictée']), arts([CHANT])]
    const j = genererCahierJournal(edt, prog, undefined, [regle('Chant', 'Français')])
    expect(dans(jour(j, 'lundi'), 'Français')).toBe(`Lecture p. 3
${CHANT}`)
    expect(dans(jour(j, 'mardi'), 'Français')).toBe(`Dictée
${CHANT}`)
  })
  it('case du français sans jours (option B) : les lignes de la semaine, puis la notion', () => {
    const edt = [c('lundi', 1, 'Français')]
    const j = genererCahierJournal(edt, [fr([], ['Lecture 1', 'Lecture 2']), arts([CHANT])], undefined, [regle('Chant', 'Français')])
    expect(dans(jour(j, 'lundi'), 'Français')).toBe(`Lecture 1
Lecture 2
${CHANT}`)
  })
  it('séance du carnet dans une case qui montre des notions : séance, puis notions', () => {
    const j = genererCahierJournal(EDT, PROGRESSION, undefined, [regle('Fluence', 'Arts plastiques', 'jeudi')])
    expect(dans(jour(j, 'jeudi'), 'Arts plastiques')).toBe(`Fluence : texte 2
${ARTS}`)
  })
})

describe('des règles qui ne concernent pas le français (F2e)', () => {
  const HORS_SUJET = [regle('Chant', 'Musique'), regle('Danse', 'EPS', 'jeudi')]
  it('le français sans jours (option B) reste identique', () => {
    const prog = [fr([], ['Lecture 1', 'Lecture 2'])]
    expect(genererCahierJournal(EDT, prog, undefined, HORS_SUJET)).toEqual(genererCahierJournal(EDT, prog))
  })
  it('un « Jour 5 » sur une semaine de quatre jours reste identique', () => {
    const prog = [fr([FLU(1, 1), FLU(5, 5)])]
    const avec = genererCahierJournal(EDT, prog, undefined, HORS_SUJET)
    expect(avec).toEqual(genererCahierJournal(EDT, prog))
    expect(aPlacer(avec)).toContain('vendredi:Fluence : texte 5')
  })
})
