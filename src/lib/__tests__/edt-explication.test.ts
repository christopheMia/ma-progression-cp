import { genererEdtCP, expliquerGenerationEdt, formatDuree } from '../edt-generator'

const toMin = (h: string) => {
  const [a, b] = h.split(':').map(Number)
  return a * 60 + b
}

/** Minutes reellement placees dans la grille pour une matiere donnee. */
function minutesPlacees(prefixe: string): number {
  return genererEdtCP(true)
    .filter(c => c.matiere.startsWith(prefixe))
    .reduce((n, c) => n + (toMin(c.heure_fin) - toMin(c.heure_debut)), 0)
}

describe('formatDuree', () => {
  test('formate heures et minutes', () => {
    expect(formatDuree(90)).toBe('1 h 30')
    expect(formatDuree(60)).toBe('1 h')
    expect(formatDuree(45)).toBe('45 min')
  })
})

describe('expliquerGenerationEdt', () => {
  const info = expliquerGenerationEdt(true)

  test('annonce les 4 jours d\'ecole', () => {
    expect(info.jours).toEqual(['lundi', 'mardi', 'jeudi', 'vendredi'])
  })

  test('le facteur d\'echelle est bien une reduction (recres deduites)', () => {
    expect(info.facteur).toBeGreaterThan(0)
    expect(info.facteur).toBeLessThan(1)
  })

  test('liste des regles non vide et sans doublon', () => {
    expect(info.regles.length).toBeGreaterThan(5)
    expect(new Set(info.regles).size).toBe(info.regles.length)
  })

  // Le coeur : la fenetre d'explication ne doit JAMAIS annoncer autre chose que
  // ce que le generateur place reellement dans la grille.
  test.each([
    ['Français : étude du code (lecture, graphèmes)', 'Etude du code'],
    ['Français : étude de la langue', 'Etude de la langue'],
    ['Mathématiques', 'Mathematiques'],
    ['Questionner le monde (dont EMC)', 'Questionner le monde'],
    ['Éducation physique et sportive', 'Education physique'],
    ['Enseignements artistiques', 'Enseignements artistiques'],
    ['Langue vivante (anglais)', 'Langue vivante'],
  ])('le volume annonce pour « %s » correspond a la grille generee', (libelle, prefixe) => {
    const annonce = info.volumes.find(v => v.matiere === libelle)
    expect(annonce).toBeTruthy()
    expect(annonce!.retenu).toBe(minutesPlacees(prefixe))
  })

  test('le total francais annonce est la somme code + langue', () => {
    const code = info.volumes.find(v => v.matiere.includes('étude du code'))!.retenu
    const langue = info.volumes.find(v => v.matiere.includes('étude de la langue'))!.retenu
    const total = info.volumes.find(v => v.matiere === 'Français (total)')!.retenu
    expect(total).toBe(code + langue)
  })
})
