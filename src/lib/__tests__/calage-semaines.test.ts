import { calerSemaines, decalagePourDemarrerEn } from '../calage-semaines'
import { periodesOfficielles } from '@/lib/calendrier-officiel'
import { datesSemainesCalendaires } from '@/lib/calendrier-semaines'
import type { ProgressionSemaine } from '@/data/manuels'

// Sommaire typique: la semaine de la rentrée est consacrée à l'accueil et aux
// rituels, le premier son arrive en semaine 2. Le manuel numérote donc à partir
// de 2. Rentrée 2026 zone A: le lundi de la semaine 1 est le 31 août 2026.
const SOMMAIRE_PREMIERE_SEMAINE_VIDE: ProgressionSemaine[] = [
  { numero: 2, items: ['a'], pages: 'p. 8-9', mots_exemple: ['ami'] },
  { numero: 3, items: ['i'], pages: 'p. 10-11', mots_exemple: ['ile'] },
  { numero: 4, items: ['o'], pages: 'p. 12-13', mots_exemple: ['moto'] },
]

describe('calerSemaines', () => {
  test('une première semaine de rentrée vide reste vide et ne décale pas l’année', () => {
    const calage = calerSemaines({
      semaines: SOMMAIRE_PREMIERE_SEMAINE_VIDE,
      rentreeDate: '2026-09-01',
      zone: 'A',
      base: 'numeros',
    })

    expect(calage.lignes).toHaveLength(4)

    expect(calage.lignes[0]).toEqual({
      numero: 1,
      dateLundi: '2026-08-31',
      periodeNumero: 1,
      items: [],
      pages: '',
      motsExemple: [],
      vide: true,
    })

    expect(calage.lignes[1]).toEqual({
      numero: 2,
      dateLundi: '2026-09-07',
      periodeNumero: 1,
      items: ['a'],
      pages: 'p. 8-9',
      motsExemple: ['ami'],
      vide: false,
    })

    expect(calage.lignes[3].numero).toBe(4)
    expect(calage.lignes[3].items).toEqual(['o'])
    expect(calage.lignes[3].dateLundi).toBe('2026-09-21')
  })

  test('un sommaire sans numéro utilisable est calé sur le seul ordre, à partir de 1', () => {
    // Quand l'IA n'a trouvé ni numéro ni date, elle numérote séquentiellement.
    // Le calage est alors incertain: c'est exactement le cas où la question
    // « ta progression démarre à quelle semaine ? » sert.
    const calage = calerSemaines({
      semaines: [
        { numero: 1, items: ['a'], pages: '', mots_exemple: [] },
        { numero: 2, items: ['i'], pages: '', mots_exemple: [] },
      ],
      rentreeDate: '2026-09-01',
      zone: 'A',
      base: 'ordre',
    })

    expect(calage.base).toBe('ordre')
    expect(calage.lignes.map(ligne => ligne.numero)).toEqual([1, 2])
    expect(calage.lignes.some(ligne => ligne.vide)).toBe(false)
    expect(calage.semaineDepart).toBe(1)
  })

  test('un trou au milieu de la numérotation reste visible', () => {
    const calage = calerSemaines({
      semaines: [
        { numero: 1, items: ['a'], pages: '', mots_exemple: [] },
        { numero: 4, items: ['o'], pages: '', mots_exemple: [] },
      ],
      rentreeDate: '2026-09-01',
      zone: 'A',
      base: 'numeros',
    })

    expect(calage.lignes.map(ligne => ligne.numero)).toEqual([1, 2, 3, 4])
    expect(calage.lignes.map(ligne => ligne.vide)).toEqual([false, true, true, false])
  })

  test('« démarrer en semaine N » se traduit en décalage, et fait apparaître le trou', () => {
    // L'enseignante répond « ma progression démarre en semaine 2 » à propos d'un
    // document que l'IA a numéroté à partir de 1.
    const semaines: ProgressionSemaine[] = [
      { numero: 1, items: ['a'], pages: '', mots_exemple: [] },
      { numero: 2, items: ['i'], pages: '', mots_exemple: [] },
    ]
    const decalage = decalagePourDemarrerEn(semaines, 2)
    expect(decalage).toBe(1)

    const calage = calerSemaines({
      semaines,
      rentreeDate: '2026-09-01',
      zone: 'A',
      base: 'ordre',
      decalage,
    })

    expect(calage.semaineDepart).toBe(2)
    expect(calage.lignes.map(ligne => ligne.numero)).toEqual([1, 2, 3])
    expect(calage.lignes[0].vide).toBe(true)
    expect(calage.lignes[1].items).toEqual(['a'])
    // La semaine vide porte quand même sa vraie date: c'est ce qui rend le
    // « je remplirai plus tard » vérifiable.
    expect(calage.lignes[0].dateLundi).toBe('2026-08-31')
  })

  test('un décalage +1 puis un retour à 0 redonne exactement l’état de départ', () => {
    const options = {
      semaines: SOMMAIRE_PREMIERE_SEMAINE_VIDE,
      rentreeDate: '2026-09-01',
      zone: 'A' as const,
      base: 'numeros' as const,
    }
    const depart = calerSemaines(options)
    const avance = calerSemaines({ ...options, decalage: 1 })
    const retour = calerSemaines({ ...options, decalage: 0 })

    expect(avance.lignes.map(ligne => ligne.numero)).toEqual([1, 2, 3, 4, 5])
    expect(avance.lignes[4].items).toEqual(['o'])
    expect(retour).toEqual(depart)
    // Le module ne modifie jamais le tableau qu'on lui donne.
    expect(SOMMAIRE_PREMIERE_SEMAINE_VIDE[0].numero).toBe(2)
  })

  test('avancer est refusé quand la dernière semaine atteint 36', () => {
    const calage = calerSemaines({
      semaines: [
        { numero: 35, items: ['bilan'], pages: '', mots_exemple: [] },
        { numero: 36, items: ['fête'], pages: '', mots_exemple: [] },
      ],
      rentreeDate: '2026-09-01',
      zone: 'A',
      base: 'numeros',
    })

    expect(calage.peutAvancer).toBe(false)
    expect(calage.peutReculer).toBe(true)
  })

  test('les dates sautent les vacances de la Toussaint', () => {
    const calage = calerSemaines({
      semaines: [{ numero: 8, items: ['ou'], pages: '', mots_exemple: [] }],
      rentreeDate: '2026-09-01',
      zone: 'A',
      base: 'numeros',
    })

    // Zone A 2026: la période 1 compte 7 semaines et se termine le 16 octobre.
    // La semaine 8 tombe donc au retour des vacances, le 2 novembre.
    const semaine8 = calage.lignes.find(ligne => ligne.numero === 8)
    expect(semaine8?.dateLundi).toBe('2026-11-02')
    expect(semaine8?.periodeNumero).toBe(2)
  })

  test('les dates affichées sont celles enregistrées à la création de la classe', () => {
    // Non-régression: si l'aperçu et la création divergeaient, l'écran mentirait.
    const reference = datesSemainesCalendaires(periodesOfficielles('2026-09-01', 'A'), 36)
    const calage = calerSemaines({
      semaines: Array.from({ length: 36 }, (_, index) => ({
        numero: index + 1,
        items: [`notion ${index + 1}`],
        pages: '',
        mots_exemple: [],
      })),
      rentreeDate: '2026-09-01',
      zone: 'A',
      base: 'numeros',
    })

    expect(calage.lignes).toHaveLength(36)
    for (const ligne of calage.lignes) {
      const attendue = reference.find(semaine => semaine.numero === ligne.numero)
      expect(ligne.dateLundi).toBe(attendue?.date_debut)
      expect(ligne.periodeNumero).toBe(attendue?.periode_numero)
    }
  })

  test('sans calendrier officiel connu, les numéros restent affichés sans date', () => {
    const calage = calerSemaines({
      semaines: [{ numero: 1, items: ['a'], pages: '', mots_exemple: [] }],
      rentreeDate: '2042-09-01',
      zone: 'A',
      base: 'numeros',
    })

    expect(calage.lignes[0].numero).toBe(1)
    expect(calage.lignes[0].dateLundi).toBe('')
    expect(calage.avertissements.join(' ')).toContain('calendrier officiel')
  })
})
