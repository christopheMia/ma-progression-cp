import { genererEdtCP, repartirVolumes, JOURS_EDT } from '../edt-generator'

const toMin = (h: string) => {
  const [a, b] = h.split(':').map(Number)
  return a * 60 + b
}

describe('genererEdtCP', () => {
  const edt = genererEdtCP(true)

  test('couvre les 4 jours d\'ecole (pas de mercredi)', () => {
    expect([...new Set(edt.map(c => c.jour))].sort()).toEqual(['jeudi', 'lundi', 'mardi', 'vendredi'])
  })

  test('un bloc code est garanti chaque matin', () => {
    for (const jour of JOURS_EDT) {
      const code = edt.find(c => c.jour === jour && c.matiere.startsWith('Etude du code'))
      expect(code).toBeTruthy()
      expect(toMin(code!.heure_debut)).toBe(8 * 60 + 45) // 1er creneau du matin
    }
  })

  test('les recreations fixes 10h00-10h15 et 15h00-15h15 sont presentes chaque jour', () => {
    for (const jour of JOURS_EDT) {
      const recres = edt.filter(c => c.jour === jour && c.matiere === 'Recreation')
      const plages = recres.map(r => `${r.heure_debut}-${r.heure_fin}`).sort()
      expect(plages).toEqual(['10:00-10:15', '15:00-15:15'])
      expect(recres.every(r => r.type === 'routine')).toBe(true)
    }
  })

  test('le temps calme lecture est place a 13h30-13h45 (retour cantine)', () => {
    for (const jour of JOURS_EDT) {
      const tc = edt.find(c => c.jour === jour && c.matiere.includes('Temps calme'))
      expect(tc?.heure_debut).toBe('13:30')
      expect(tc?.heure_fin).toBe('13:45')
    }
  })

  test('un rituel ouvre chaque journee a 8h30', () => {
    for (const jour of JOURS_EDT) {
      const first = edt.filter(c => c.jour === jour).sort((a, b) => a.ordre - b.ordre)[0]
      expect(first.matiere.startsWith('Rituels')).toBe(true)
      expect(first.heure_debut).toBe('08:30')
    }
  })

  test('aucun chevauchement horaire dans une journee', () => {
    for (const jour of JOURS_EDT) {
      const jourCr = edt.filter(c => c.jour === jour).sort((a, b) => toMin(a.heure_debut) - toMin(b.heure_debut))
      for (let i = 1; i < jourCr.length; i++) {
        expect(toMin(jourCr[i].heure_debut)).toBeGreaterThanOrEqual(toMin(jourCr[i - 1].heure_fin))
      }
    }
  })

  test('priorite matin : maths est place le matin', () => {
    const maths = edt.filter(c => c.matiere === 'Mathematiques')
    expect(maths.length).toBeGreaterThan(0)
    expect(maths.every(c => toMin(c.heure_debut) < 12 * 60)).toBe(true)
  })

  test('le volume de cours effectif est proche de 20h (1200 min)', () => {
    const minutesCours = edt
      .filter(c => c.type === 'cours')
      .reduce((s, c) => s + (toMin(c.heure_fin) - toMin(c.heure_debut)), 0)
    // 20h de cours + 1h de temps calme lecture (15 min x 4) = 1260 min
    expect(minutesCours).toBeGreaterThanOrEqual(1200)
    expect(minutesCours).toBeLessThanOrEqual(1320)
  })

  test('repartirVolumes applique un facteur d\'echelle equitable < 1', () => {
    const { facteur, budgetCours } = repartirVolumes(true)
    expect(budgetCours).toBe(1200)
    expect(facteur).toBeGreaterThan(0.8)
    expect(facteur).toBeLessThan(0.85)
  })
})
