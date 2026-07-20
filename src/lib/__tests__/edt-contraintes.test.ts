import { genererEdtCP, JOURS_EDT, repartirSeances } from '../edt-generator'

const toMin = (h: string) => {
  const [a, b] = h.split(':').map(Number)
  return a * 60 + b
}

describe('repartirSeances', () => {
  test('distribue toutes les seances disponibles', () => {
    const alloc = repartirSeances(
      [{ matiere: 'A', minutes: 300 }, { matiere: 'B', minutes: 100 }], 8, 4)
    expect(alloc.reduce((n, a) => n + a.seances, 0)).toBe(8)
  })

  test('respecte le maximum d\'une seance par jour', () => {
    const alloc = repartirSeances(
      [{ matiere: 'A', minutes: 900 }, { matiere: 'B', minutes: 100 }], 8, 4)
    for (const a of alloc) expect(a.seances).toBeLessThanOrEqual(4)
  })

  test('donne plus de seances a la matiere qui pese le plus', () => {
    const alloc = repartirSeances(
      [{ matiere: 'Grosse', minutes: 400 }, { matiere: 'Petite', minutes: 100 }], 5, 4)
    const grosse = alloc.find(a => a.matiere === 'Grosse')!.seances
    const petite = alloc.find(a => a.matiere === 'Petite')!.seances
    expect(grosse).toBeGreaterThan(petite)
  })

  test('ne plante pas sur une demande vide', () => {
    expect(repartirSeances([], 8, 4)).toEqual([])
  })
})

describe('contraintes de repartition de l\'EDT genere', () => {
  const edt = genererEdtCP(true)
  const cours = edt.filter(c => c.type !== 'routine' && !c.matiere.startsWith('Temps calme'))

  test('aucune matiere n\'apparait deux fois le meme jour', () => {
    for (const jour of JOURS_EDT) {
      const vues = cours.filter(c => c.jour === jour).map(c => c.matiere)
      expect(new Set(vues).size).toBe(vues.length)
    }
  })

  test('chaque seance dure au moins une heure pleine', () => {
    for (const c of cours) {
      expect(toMin(c.heure_fin) - toMin(c.heure_debut)).toBeGreaterThanOrEqual(60)
    }
  })

  test('l\'EPS est repartie sur plusieurs jours plutot que groupee', () => {
    const jours = new Set(
      cours.filter(c => c.matiere.startsWith('Education physique')).map(c => c.jour))
    expect(jours.size).toBeGreaterThan(1)
  })

  test('le bloc code du matin reste garanti chaque jour', () => {
    for (const jour of JOURS_EDT) {
      const code = edt.find(c => c.jour === jour && c.matiere.startsWith('Etude du code'))
      expect(code).toBeTruthy()
      expect(toMin(code!.heure_debut)).toBe(8 * 60 + 45)
    }
  })

  test('aucun creneau ne se chevauche et aucun trou dans la journee', () => {
    for (const jour of JOURS_EDT) {
      const duJour = edt.filter(c => c.jour === jour)
        .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
      for (let i = 1; i < duJour.length; i++) {
        expect(toMin(duJour[i].heure_debut)).toBe(toMin(duJour[i - 1].heure_fin))
      }
    }
  })

  test('chaque journee va jusqu\'a la fin des cours', () => {
    for (const jour of JOURS_EDT) {
      const fin = Math.max(...edt.filter(c => c.jour === jour).map(c => toMin(c.heure_fin)))
      expect(fin).toBe(16 * 60 + 30)
    }
  })
})
