import { genererProgression, genererProgressionFrancais, genererSqueletteSemaines } from '../progression'

test('genere un squelette de 36 semaines sans methode ni contenu de manuel', () => {
  const semaines = genererSqueletteSemaines('2025-09-02')

  expect(semaines).toHaveLength(36)
  expect(semaines[0]).toEqual({
    numero: 1,
    date_debut: '2025-09-02',
    graphemes: [],
    edm_theme: '',
    edm_competences: '',
    manuel_pages: null,
    mots_exemple: null,
    note: null,
  })
  expect(semaines[1].date_debut).toBe('2025-09-09')
  expect(semaines[35].graphemes).toEqual([])
  expect(semaines[35].manuel_pages).toBeNull()
  expect(semaines[35].mots_exemple).toBeNull()
})

test('génère 36 semaines', () => {
  const semaines = genererProgression('lecture-piano', '2025-09-02')
  expect(semaines).toHaveLength(36)
})

test('la semaine 1 commence le jour de rentrée', () => {
  const semaines = genererProgression('lecture-piano', '2025-09-02')
  expect(semaines[0].date_debut).toBe('2025-09-02')
})

test('les semaines ont les graphèmes du manuel', () => {
  const semaines = genererProgression('lecture-piano', '2025-09-02')
  expect(semaines[0].graphemes).toEqual(['a'])
  expect(semaines[7].graphemes).toEqual(['ou'])
})

test('aucun thème n’est imposé à la création : les semaines partent vides', () => {
  // Une progression d'exemple (« questionner le monde ») etait posee d'office sur
  // les 36 semaines de toute nouvelle classe. Retiree le 26/07/2026 : le contenu
  // vient desormais uniquement des documents importes par l'enseignante.
  const semaines = genererProgression('lecture-piano', '2025-09-02')
  expect(semaines.every(semaine => semaine.edm_theme === '')).toBe(true)
  expect(semaines.every(semaine => semaine.edm_competences === '')).toBe(true)
})

test('genererProgressionFrancais renvoie les items du manuel (mode démo)', () => {
  const prog = genererProgressionFrancais('lecture-piano')
  expect(prog).toHaveLength(36)
  expect(prog[0].items).toEqual(['a'])
  expect(prog[7].items).toEqual(['ou'])
  expect(prog[0].numero).toBe(1)
})

test('genererProgressionFrancais utilise la progression custom si fournie', () => {
  const custom = [
    { numero: 1, items: ['z'], pages: 'p.1', mots_exemple: ['zoo'] },
    { numero: 2, items: ['x'], pages: '', mots_exemple: [] },
  ]
  const prog = genererProgressionFrancais('custom', custom)
  expect(prog).toHaveLength(2)
  expect(prog[0].items).toEqual(['z'])
  expect(prog[1].pages).toBeNull() // '' -> null
})

test('genererProgressionFrancais renvoie [] pour un manuel inconnu sans custom', () => {
  expect(genererProgressionFrancais('inexistant')).toEqual([])
})
