import { genererEdtCP, budgetHebdomadaire, JOURS_EDT } from '../edt-generator'

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

  // Le "temps calme lecture" de 13h30 a ete supprime lors de la refonte du
  // 21/07 : il consommait 1 h par semaine hors quota, ce qui empechait
  // d'atteindre les volumes reglementaires. L'apres-midi reprend directement
  // a 13h30 sur une vraie seance.
  test('l\'apres-midi reprend a 13h30 sur du temps d\'enseignement', () => {
    for (const jour of JOURS_EDT) {
      const reprise = edt.find(c => c.jour === jour && c.heure_debut === '13:30')
      expect(reprise).toBeTruthy()
      expect(reprise!.type).toBe('cours')
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

  // Depuis le passage a "une seance = un creneau entier", maths et etude de la
  // langue totalisent 6 seances pour seulement 4 creneaux libres le matin : une
  // seance de maths tombe donc forcement l'apres-midi. La garantie reelle n'est
  // pas "maths toujours le matin" mais "le matin est reserve aux fondamentaux".
  // Depuis la refonte du 21/07 (respect des quotas reglementaires), le matin
  // n'est plus reserve aux fondamentaux : chaque creneau sert la matiere a qui
  // il reste le plus d'heures. Seul le bloc code reste garanti le matin, ce qui
  // est deja verifie plus haut. Les quotas eux-memes sont couverts par
  // edt-contraintes.test.ts.

  test('le volume de cours effectif atteint le budget de 22 h', () => {
    const minutesCours = edt
      .filter(c => c.type === 'cours')
      .reduce((s, c) => s + (toMin(c.heure_fin) - toMin(c.heure_debut)), 0)
    expect(minutesCours).toBe(budgetHebdomadaire())
    expect(minutesCours).toBe(22 * 60)
  })

  test('les recreations et la pause meridienne restent hors du temps de cours', () => {
    const routines = edt.filter(c => c.type === 'routine').map(c => c.matiere)
    expect(routines).toContain('Recreation')
    expect(routines).toContain('Pause dejeuner / cantine')
  })
})
