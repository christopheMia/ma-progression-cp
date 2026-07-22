import { datesSemainesCalendaires } from '@/lib/calendrier-semaines'
import { estZoneScolaire, periodesOfficielles, rentreeOfficielleParDefaut } from '@/lib/calendrier-officiel'

describe('calendrier scolaire officiel', () => {
  test('construit les cinq periodes 2026-2027 de la zone A', () => {
    const periodes = periodesOfficielles('2026-09-01', 'A')
    expect(periodes).toHaveLength(5)
    expect(periodes[0]).toMatchObject({ numero: 1, date_debut: '2026-09-01', date_fin: '2026-10-17' })
    expect(periodes[2]).toMatchObject({ numero: 3, date_debut: '2027-01-04', date_fin: '2027-02-13' })
    expect(periodes[4]).toMatchObject({ numero: 5, date_debut: '2027-04-26', date_fin: '2027-07-03' })
  })

  test('place 36 semaines en sautant les vacances de zone A', () => {
    const semaines = datesSemainesCalendaires(periodesOfficielles('2026-09-01', 'A'), 36)
    expect(semaines).toHaveLength(36)
    expect(semaines[0]).toEqual({ numero: 1, date_debut: '2026-08-31', periode_numero: 1 })
    expect(semaines[7]).toEqual({ numero: 8, date_debut: '2026-11-02', periode_numero: 2 })
    expect(semaines[35].periode_numero).toBe(5)
  })

  test('respecte les decalages entre les zones', () => {
    expect(periodesOfficielles('2026-09-01', 'A')[3].date_debut).toBe('2027-03-01')
    expect(periodesOfficielles('2026-09-01', 'B')[3].date_debut).toBe('2027-03-08')
    expect(periodesOfficielles('2026-09-01', 'C')[3].date_debut).toBe('2027-02-22')
  })

  test('refuse une zone ou une annee inconnue sans inventer de dates', () => {
    expect(estZoneScolaire('A')).toBe(true)
    expect(estZoneScolaire('D')).toBe(false)
    expect(periodesOfficielles('2027-09-01', 'A')).toEqual([])
    expect(rentreeOfficielleParDefaut('A')).toBe('2026-09-01')
  })
})
