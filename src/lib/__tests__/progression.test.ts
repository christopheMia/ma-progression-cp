import { genererProgression } from '../progression'

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
