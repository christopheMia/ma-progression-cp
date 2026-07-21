import { decouper, capacite, remplirEnveloppes } from '../edt-items'
import type { CreneauTrame } from '@/data/trame-edt'

const env = (jour: string, debut: string, fin: string, matiere: string): CreneauTrame => ({
  jour, heure_debut: debut, heure_fin: fin, matiere,
  type: 'cours', couleur: null, ordre: 0,
})

const minutes = (c: CreneauTrame) => {
  const [hd, md] = c.heure_debut.split(':').map(Number)
  const [hf, mf] = c.heure_fin.split(':').map(Number)
  return hf * 60 + mf - (hd * 60 + md)
}

describe('decouper', () => {
  test('partage exactement, sans perdre une minute', () => {
    expect(decouper(120, 4)).toEqual([30, 30, 30, 30])
    expect(decouper(120, 4).reduce((s, d) => s + d, 0)).toBe(120)
  })

  test('le reste va aux premieres parts', () => {
    // 75 min en 2 : 45 + 30, jamais 30 + 45.
    expect(decouper(75, 2)).toEqual([45, 30])
  })

  test('tout reste cale sur le quart d\'heure', () => {
    for (const d of decouper(105, 4)) expect(d % 15).toBe(0)
  })

  test('refuse de couper plus fin que le quart d\'heure', () => {
    expect(decouper(30, 4)).toEqual([30]) // 4 parts impossibles dans 30 min
  })
})

describe('capacite', () => {
  test('une plage de 2 h accepte au plus 8 items', () => {
    expect(capacite(120)).toBe(8)
  })
  test('une plage courte accepte au moins un item', () => {
    expect(capacite(10)).toBe(1)
  })
})

describe('remplirEnveloppes', () => {
  test('une enveloppe de 2 h devient plusieurs items du manuel', () => {
    const grille = [env('lundi', '08:45', '10:45', 'Etude de la langue (francais)')]
    const out = remplirEnveloppes(grille, {
      francais: ['Phonologie : A et I', 'Ateliers de francais', 'Vocabulaire : seance 3'],
    })
    expect(out).toHaveLength(3)
    expect(out.map(c => c.matiere)).toEqual([
      'Phonologie : A et I', 'Ateliers de francais', 'Vocabulaire : seance 3',
    ])
    // Aucune minute perdue, et la plage garde ses bornes.
    expect(out[0].heure_debut).toBe('08:45')
    expect(out[out.length - 1].heure_fin).toBe('10:45')
    expect(out.reduce((s, c) => s + minutes(c), 0)).toBe(120)
  })

  test('plus aucun bloc monolithique : le plus long tombe sous 1 h', () => {
    const grille = [env('lundi', '08:45', '10:45', 'Mathematiques')]
    const out = remplirEnveloppes(grille, {
      maths: ['Calcul mental', 'Nombres jusqu a 10', 'Probleme', 'Geometrie'],
    })
    expect(Math.max(...out.map(minutes))).toBeLessThanOrEqual(30)
  })

  test('une matiere sans manuel garde son enveloppe intacte', () => {
    // Decision de Christophe : Cecile ajustera a la main.
    const grille = [
      env('lundi', '13:45', '15:00', 'Education physique et sportive'),
      env('lundi', '15:15', '16:30', 'Etude de la langue (francais)'),
    ]
    const out = remplirEnveloppes(grille, { francais: ['Ecriture', 'Lecture'] })
    expect(out.filter(c => c.matiere === 'Education physique et sportive')).toHaveLength(1)
  })

  test('les items s\'etalent sur la semaine, dans l\'ordre', () => {
    const grille = [
      env('lundi', '08:45', '09:45', 'Etude de la langue (francais)'),
      env('mardi', '08:45', '09:45', 'Etude de la langue (francais)'),
    ]
    const out = remplirEnveloppes(grille, { francais: ['A', 'B', 'C', 'D'] })
    const lundi = out.filter(c => c.jour === 'lundi').map(c => c.matiere)
    const mardi = out.filter(c => c.jour === 'mardi').map(c => c.matiere)
    expect(lundi).toEqual(['A', 'B'])
    expect(mardi).toEqual(['C', 'D'])
  })

  test('une enveloppe plus longue recoit plus d\'items', () => {
    const grille = [
      env('lundi', '08:45', '10:45', 'Mathematiques'), // 2 h
      env('mardi', '08:45', '09:15', 'Mathematiques'), // 30 min
    ]
    const out = remplirEnveloppes(grille, { maths: ['A', 'B', 'C', 'D', 'E'] })
    const lundi = out.filter(c => c.jour === 'lundi')
    const mardi = out.filter(c => c.jour === 'mardi')
    expect(lundi.length).toBeGreaterThan(mardi.length)
  })

  test('aucun item n\'est perdu ni duplique', () => {
    const grille = [
      env('lundi', '08:45', '10:00', 'Etude de la langue (francais)'),
      env('mardi', '08:45', '10:00', 'Etude de la langue (francais)'),
    ]
    const items = ['A', 'B', 'C', 'D', 'E']
    const out = remplirEnveloppes(grille, { francais: items })
    const places = out.map(c => c.matiere)
    expect(places.sort()).toEqual(items.sort())
  })

  test('les routines ne sont jamais remplacees par un item', () => {
    const grille: CreneauTrame[] = [
      { ...env('lundi', '10:00', '10:15', 'Recreation'), type: 'routine' },
      env('lundi', '10:15', '11:15', 'Etude de la langue (francais)'),
    ]
    const out = remplirEnveloppes(grille, { francais: ['A', 'B'] })
    expect(out.find(c => c.type === 'routine')?.matiere).toBe('Recreation')
  })

  test('sans aucun item, la grille ressort inchangee', () => {
    const grille = [env('lundi', '08:45', '10:45', 'Mathematiques')]
    expect(remplirEnveloppes(grille, {})).toEqual(grille.map((c, i) => ({ ...c, ordre: i })))
  })

  test('la journee reste continue : aucun trou introduit', () => {
    const grille = [
      env('lundi', '08:45', '10:00', 'Etude de la langue (francais)'),
      env('lundi', '10:00', '11:00', 'Mathematiques'),
    ]
    const out = remplirEnveloppes(grille, { francais: ['A', 'B'], maths: ['C', 'D'] })
    for (let i = 1; i < out.length; i++) {
      expect(out[i].heure_debut).toBe(out[i - 1].heure_fin)
    }
  })
})
