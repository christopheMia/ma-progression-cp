import { genererProgression, genererProgressionFrancais } from '../progression'

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

test('les semaines ont les thèmes EDM', () => {
  const semaines = genererProgression('lecture-piano', '2025-09-02')
  expect(semaines[0].edm_theme).toBe('Moi')
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
