import { datesSemainesCalendaires, type PeriodeBornes } from '../calendrier-semaines'

// Calendrier officiel zone A, année scolaire 2026-2027 (bornes des périodes).
const PERIODES_ZONE_A: PeriodeBornes[] = [
  { numero: 1, date_debut: '2026-09-01', date_fin: '2026-10-16' },
  { numero: 2, date_debut: '2026-11-02', date_fin: '2026-12-18' },
  { numero: 3, date_debut: '2027-01-04', date_fin: '2027-02-12' },
  { numero: 4, date_debut: '2027-03-01', date_fin: '2027-04-09' },
  { numero: 5, date_debut: '2027-04-26', date_fin: '2027-07-03' },
]

describe('datesSemainesCalendaires', () => {
  const semaines = datesSemainesCalendaires(PERIODES_ZONE_A, 36)

  test('place bien 36 semaines de classe', () => {
    expect(semaines).toHaveLength(36)
  })

  test('la période 5 est la plus longue (fin avril → juillet)', () => {
    const parPeriode = (p: number) => semaines.filter(s => s.periode_numero === p).length
    expect(parPeriode(1)).toBe(7)
    expect(parPeriode(2)).toBe(7)
    expect(parPeriode(3)).toBe(6)
    expect(parPeriode(4)).toBe(6)
    expect(parPeriode(5)).toBe(10)
  })

  test('aucune semaine ne tombe pendant les vacances (ex. Toussaint 17/10→01/11)', () => {
    const enVacances = semaines.some(s => s.date_debut > '2026-10-16' && s.date_debut < '2026-11-02')
    expect(enVacances).toBe(false)
  })

  test('les dates sont des lundis strictement croissants', () => {
    for (let i = 1; i < semaines.length; i++) {
      expect(semaines[i].date_debut > semaines[i - 1].date_debut).toBe(true)
      expect(new Date(semaines[i].date_debut + 'T00:00:00').getDay()).toBe(1) // lundi (heure locale)
    }
  })

  test('la 1re semaine couvre la rentrée et la dernière va jusqu\'en juin/juillet', () => {
    expect(semaines[0].periode_numero).toBe(1)
    expect(semaines[0].date_debut <= '2026-09-01').toBe(true)
    expect(semaines[35].date_debut >= '2027-06-01').toBe(true)
    expect(semaines[35].periode_numero).toBe(5)
  })

  test('bornes vides ou nbSemaines nul => tableau vide', () => {
    expect(datesSemainesCalendaires([], 36)).toEqual([])
    expect(datesSemainesCalendaires(PERIODES_ZONE_A, 0)).toEqual([])
  })
})
