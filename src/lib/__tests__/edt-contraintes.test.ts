import {
  genererEdtCP,
  JOURS_EDT,
  plafondJournalier,
  MINUTES_MAX_JOUR_SEANCE_COURTE,
  MINUTES_MAX_JOUR_GENERAL,
} from '../edt-generator'

const toMin = (h: string) => {
  const [a, b] = h.split(':').map(Number)
  return a * 60 + b
}

describe('plafondJournalier', () => {
  test('EPS, arts et histoire sont plafonnes bas', () => {
    expect(plafondJournalier('Education physique et sportive')).toBe(MINUTES_MAX_JOUR_SEANCE_COURTE)
    expect(plafondJournalier('Enseignements artistiques')).toBe(MINUTES_MAX_JOUR_SEANCE_COURTE)
    expect(plafondJournalier('Histoire geographie')).toBe(MINUTES_MAX_JOUR_SEANCE_COURTE)
  })

  test('les matieres generales ont le plafond haut', () => {
    expect(plafondJournalier('Mathematiques')).toBe(MINUTES_MAX_JOUR_GENERAL)
    expect(plafondJournalier('Questionner le monde')).toBe(MINUTES_MAX_JOUR_GENERAL)
    expect(plafondJournalier('Etude du code (lecture, graphemes)')).toBe(MINUTES_MAX_JOUR_GENERAL)
  })
})

describe('contraintes de repartition de l\'EDT genere', () => {
  const edt = genererEdtCP(true)

  /** Minutes de cours par (jour, matiere). Les routines ne comptent pas. */
  function minutesParJourEtMatiere(): Map<string, number> {
    const cumul = new Map<string, number>()
    for (const c of edt) {
      if (c.type === 'routine') continue
      const cle = `${c.jour}|${c.matiere}`
      cumul.set(cle, (cumul.get(cle) ?? 0) + (toMin(c.heure_fin) - toMin(c.heure_debut)))
    }
    return cumul
  }

  test('aucune matiere ne depasse son plafond quotidien', () => {
    for (const [cle, minutes] of minutesParJourEtMatiere()) {
      const matiere = cle.split('|')[1]
      expect({ cle, minutes }).toMatchObject({ cle, minutes: expect.any(Number) })
      expect(minutes).toBeLessThanOrEqual(plafondJournalier(matiere))
    }
  })

  test('pas 2 h d\'EPS, d\'arts ou d\'histoire le meme jour', () => {
    for (const [cle, minutes] of minutesParJourEtMatiere()) {
      const matiere = cle.split('|')[1]
      if (plafondJournalier(matiere) !== MINUTES_MAX_JOUR_SEANCE_COURTE) continue
      expect(minutes).toBeLessThan(120)
    }
  })

  test('l\'EPS est repartie sur plusieurs jours plutot que groupee', () => {
    const jours = new Set(
      edt.filter(c => c.matiere.startsWith('Education physique')).map(c => c.jour)
    )
    expect(jours.size).toBeGreaterThan(1)
  })

  test('le bloc code du matin reste garanti chaque jour', () => {
    for (const jour of JOURS_EDT) {
      const code = edt.find(c => c.jour === jour && c.matiere.startsWith('Etude du code'))
      expect(code).toBeTruthy()
      expect(toMin(code!.heure_debut)).toBe(8 * 60 + 45)
    }
  })

  test('aucun creneau ne se chevauche sur une meme journee', () => {
    for (const jour of JOURS_EDT) {
      const duJour = edt.filter(c => c.jour === jour)
        .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
      for (let i = 1; i < duJour.length; i++) {
        expect(toMin(duJour[i].heure_debut)).toBeGreaterThanOrEqual(toMin(duJour[i - 1].heure_fin))
      }
    }
  })
})
