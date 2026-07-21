import {
  genererEdtCP,
  repartirQuotas,
  budgetHebdomadaire,
  choisirDuree,
  dureeMaxSeance,
  maxParJour,
  JOURS_EDT,
  VOLUME_OFFICIEL_CP,
} from '../edt-generator'

const toMin = (h: string) => {
  const [a, b] = h.split(':').map(Number)
  return a * 60 + b
}

describe('repartirQuotas', () => {
  const budget = budgetHebdomadaire()
  const quotas = repartirQuotas(budget)

  test('la somme des quotas retombe EXACTEMENT sur le budget', () => {
    expect(quotas.reduce((n, q) => n + q.minutes, 0)).toBe(budget)
  })

  test('tout est cale sur le quart d\'heure', () => {
    for (const q of quotas) expect(q.minutes % 15).toBe(0)
  })

  test('les proportions officielles sont respectees', () => {
    const nominal = Object.values(VOLUME_OFFICIEL_CP).reduce((s, v) => s + v, 0)
    const fr = quotas.find(q => q.matiere === 'francais')!.minutes
    const maths = quotas.find(q => q.matiere === 'maths')!.minutes
    // Le francais pese 10/24 du total officiel : sa part doit rester la meme,
    // a un quart d'heure pres (arrondis).
    expect(Math.abs(fr - (VOLUME_OFFICIEL_CP.francais / nominal) * budget)).toBeLessThanOrEqual(15)
    expect(Math.abs(maths - (VOLUME_OFFICIEL_CP.maths / nominal) * budget)).toBeLessThanOrEqual(15)
  })

  test('aucune matiere n\'est oubliee', () => {
    expect(quotas.map(q => q.matiere).sort()).toEqual(
      ['arts', 'eps', 'francais', 'lv', 'maths', 'qlm'])
  })
})

describe('choisirDuree', () => {
  test('remplit la plage entiere quand c\'est possible', () => {
    expect(choisirDuree(75, 200, 120, 120)).toBe(75)
  })

  test('ne laisse jamais un reliquat de plage inutilisable', () => {
    // 90 disponibles, la matiere peut tout prendre : on evite de laisser 15 min.
    const d = choisirDuree(90, 200, 120, 120)
    const reliquat = 90 - d
    expect(reliquat === 0 || reliquat >= 30).toBe(true)
  })

  test('ne laisse pas 15 min orphelines dans le quota d\'une matiere', () => {
    // Il reste 45 min a cette matiere : prendre 30 laisserait 15 min impossibles
    // a replacer, donc on prend les 45.
    expect(choisirDuree(75, 45, 120, 120)).toBe(45)
  })

  test('respecte le plafond de seance et la marge du jour', () => {
    expect(choisirDuree(120, 300, 60, 120)).toBeLessThanOrEqual(60)
    expect(choisirDuree(120, 300, 120, 90)).toBeLessThanOrEqual(90)
  })
})

describe('regles de duree par matiere', () => {
  test('EPS et arts plafonnent a 1 h 30', () => {
    expect(dureeMaxSeance('Education physique et sportive')).toBe(90)
    expect(dureeMaxSeance('Enseignements artistiques')).toBe(90)
    expect(maxParJour('Education physique et sportive')).toBe(90)
  })

  test('les matieres principales vont jusqu\'a 2 h', () => {
    expect(dureeMaxSeance('Mathematiques')).toBe(120)
    expect(dureeMaxSeance('Etude de la langue (francais)')).toBe(120)
    expect(maxParJour('Mathematiques')).toBe(120)
  })
})

describe('grille generee', () => {
  const edt = genererEdtCP(true)
  const cours = edt.filter(c => c.type !== 'routine')

  test('le total place correspond exactement au budget', () => {
    const total = cours.reduce((n, c) => n + toMin(c.heure_fin) - toMin(c.heure_debut), 0)
    expect(total).toBe(budgetHebdomadaire())
  })

  test('chaque matiere obtient son quota au quart d\'heure pres', () => {
    const quotas = repartirQuotas(budgetHebdomadaire())
    const volume = (...prefixes: string[]) => cours
      .filter(c => prefixes.some(p => c.matiere.startsWith(p)))
      .reduce((n, c) => n + toMin(c.heure_fin) - toMin(c.heure_debut), 0)

    const attendu = (cle: string) => quotas.find(q => q.matiere === cle)!.minutes
    expect(volume('Rituels', 'Etude du code', 'Etude de la langue')).toBe(attendu('francais'))
    expect(volume('Mathematiques')).toBe(attendu('maths'))
    expect(volume('Questionner')).toBe(attendu('qlm'))
    expect(volume('Education physique')).toBe(attendu('eps'))
    expect(volume('Enseignements artistiques')).toBe(attendu('arts'))
    expect(volume('Langue vivante')).toBe(attendu('lv'))
  })

  test('toutes les durees sont des multiples de 15 min', () => {
    for (const c of edt) {
      expect((toMin(c.heure_fin) - toMin(c.heure_debut)) % 15).toBe(0)
    }
  })

  test('aucune seance ne depasse son plafond', () => {
    for (const c of cours) {
      if (c.matiere.startsWith('Rituels')) continue
      expect(toMin(c.heure_fin) - toMin(c.heure_debut))
        .toBeLessThanOrEqual(dureeMaxSeance(c.matiere))
    }
  })

  test('aucune matiere ne depasse son volume quotidien', () => {
    for (const jour of JOURS_EDT) {
      const parMatiere = new Map<string, number>()
      for (const c of cours.filter(c => c.jour === jour)) {
        if (c.matiere.startsWith('Rituels')) continue
        const d = toMin(c.heure_fin) - toMin(c.heure_debut)
        parMatiere.set(c.matiere, (parMatiere.get(c.matiere) ?? 0) + d)
      }
      for (const [m, v] of parMatiere) expect(v).toBeLessThanOrEqual(maxParJour(m))
    }
  })

  test('le bloc code est garanti chaque matin, juste apres les rituels', () => {
    for (const jour of JOURS_EDT) {
      const code = edt.find(c => c.jour === jour && c.matiere.startsWith('Etude du code'))
      expect(code).toBeTruthy()
      expect(toMin(code!.heure_debut)).toBe(8 * 60 + 45)
    }
  })

  test('les rituels durent 15 min chaque jour', () => {
    for (const jour of JOURS_EDT) {
      const rituel = edt.find(c => c.jour === jour && c.matiere.startsWith('Rituels'))
      expect(rituel).toBeTruthy()
      expect(toMin(rituel!.heure_fin) - toMin(rituel!.heure_debut)).toBe(15)
    }
  })

  test('journees pleines : ni trou ni chevauchement, de 8h30 a 16h30', () => {
    for (const jour of JOURS_EDT) {
      const duJour = edt.filter(c => c.jour === jour)
        .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
      expect(toMin(duJour[0].heure_debut)).toBe(8 * 60 + 30)
      for (let i = 1; i < duJour.length; i++) {
        expect(toMin(duJour[i].heure_debut)).toBe(toMin(duJour[i - 1].heure_fin))
      }
      expect(toMin(duJour[duJour.length - 1].heure_fin)).toBe(16 * 60 + 30)
    }
  })
})
