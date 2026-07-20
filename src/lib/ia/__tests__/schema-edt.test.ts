import { normaliserHeure, normaliserEdtImporte } from '../schema-edt'

describe('normaliserHeure', () => {
  test('accepte les formats du terrain', () => {
    expect(normaliserHeure('8h20')).toBe('08:20')
    expect(normaliserHeure('08:20')).toBe('08:20')
    expect(normaliserHeure('13h')).toBe('13:00')
    expect(normaliserHeure(' 9:05 ')).toBe('09:05')
  })

  test('rejette ce qui n\'est pas une heure', () => {
    expect(normaliserHeure('midi')).toBeNull()
    expect(normaliserHeure('25h00')).toBeNull()
    expect(normaliserHeure('8h75')).toBeNull()
    expect(normaliserHeure(null)).toBeNull()
  })
})

describe('normaliserEdtImporte', () => {
  test('normalise, trie et conserve le libelle exact', () => {
    const out = normaliserEdtImporte([
      { jour: 'mardi', heure_debut: '8h30', heure_fin: '8h35', matiere: 'Rituel date', type: 'routine' },
      { jour: 'lundi', heure_debut: '10h15', heure_fin: '10h25', matiere: 'Chaque jour compte', type: 'cours' },
      { jour: 'lundi', heure_debut: '8h40', heure_fin: '9h10', matiere: 'Phonologie encodage décodage', type: 'cours' },
    ])
    expect(out.map(c => `${c.jour} ${c.heure_debut}`)).toEqual([
      'lundi 08:40', 'lundi 10:15', 'mardi 08:30',
    ])
    expect(out[0].matiere).toBe('Phonologie encodage décodage')
  })

  test('ecarte les lignes inexploitables plutot que d\'inserer une grille cassee', () => {
    const out = normaliserEdtImporte([
      { jour: 'samedi', heure_debut: '08:00', heure_fin: '09:00', matiere: 'X', type: 'cours' },
      { jour: 'lundi', heure_debut: '10:00', heure_fin: '09:00', matiere: 'Inverse', type: 'cours' },
      { jour: 'lundi', heure_debut: '08:00', heure_fin: '08:00', matiere: 'Vide', type: 'cours' },
      { jour: 'lundi', heure_debut: '08:00', heure_fin: '09:00', matiere: '', type: 'cours' },
      { jour: 'lundi', heure_debut: '08:00', heure_fin: '09:00', matiere: 'Bon', type: 'cours' },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].matiere).toBe('Bon')
  })

  test('tout type inconnu retombe sur "cours"', () => {
    const out = normaliserEdtImporte([
      { jour: 'lundi', heure_debut: '08:00', heure_fin: '09:00', matiere: 'A', type: 'nimporte' },
    ])
    expect(out[0].type).toBe('cours')
  })
})
