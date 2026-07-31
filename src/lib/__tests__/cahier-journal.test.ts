import { genererCahierJournal, itemsDuJour, numeroJourItem } from '../cahier-journal'
import type { CreneauHoraire } from '@/types'

const creneau = (over: Partial<CreneauHoraire>): CreneauHoraire => ({
  id: 'x', class_id: 'c', jour: 'lundi', heure_debut: '08:45', heure_fin: '09:15',
  matiere: 'Lecture', ordre: 0, couleur: null, type: 'cours',
  methode_id: null, visible_journal: true, ...over,
})

describe('genererCahierJournal (lien par méthode)', () => {
  const progression = [
    { methode_id: 'm-fr', matiere: 'francais', items: ['a'], pages: 'p.10-13', mots_exemple: ['ami', 'papa'] },
    { methode_id: 'm-ma', matiere: 'maths', items: ['Nombres jusqu’à 10'], pages: 'p.8', mots_exemple: [] },
  ]

  test('une fiche par jour, dans l’ordre', () => {
    const edt = [creneau({ jour: 'lundi' }), creneau({ jour: 'jeudi' })]
    expect(genererCahierJournal(edt, progression).map(j => j.jour)).toEqual(['lundi', 'jeudi'])
  })

  test('les lignes routine ne sont pas remplissables', () => {
    const edt = [creneau({ matiere: 'Récréation', type: 'routine' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.type).toBe('routine')
    expect(s.deroulement).toBe('')
  })

  test('un créneau relié à la méthode française est pré-rempli', () => {
    const edt = [creneau({ matiere: 'Lecture', methode_id: 'm-fr' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.deroulement).toContain('a')
    expect(s.deroulement).toContain('p.10-13')
  })

  test('un créneau relié à la méthode maths est pré-rempli', () => {
    const edt = [creneau({ matiere: 'Maths', methode_id: 'm-ma' })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.deroulement).toContain('Nombres jusqu’à 10')
  })

  // Décision de Christophe du 31/07 : une case vide n'invite à rien et ne dit
  // pas si l'application n'a rien trouvé ou s'il n'y a rien de prévu. On y met
  // le nom de la matière, que l'enseignante complète.
  test('un créneau sans progression affiche sa matière, à compléter', () => {
    const edt = [creneau({ matiere: 'Arts visuels', methode_id: null })]
    expect(genererCahierJournal(edt, progression)[0].seances[0].deroulement).toBe('Arts visuels')
  })

  test('une routine reste vide : elle ne se remplit pas', () => {
    const edt = [creneau({ matiere: 'Récréation', type: 'routine' })]
    expect(genererCahierJournal(edt, progression)[0].seances[0].deroulement).toBe('')
  })

  test('repli : un créneau français non relié est rempli via le libellé', () => {
    // Cas du bug remonté par Cécile : progression enregistrée mais créneaux
    // jamais reliés manuellement à une méthode. Le journal doit se remplir.
    const edt = [creneau({ matiere: 'Appropriation des graphèmes', methode_id: null })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.deroulement).toContain('a')
    expect(s.deroulement).toContain('p.10-13')
  })

  test('repli : un créneau de calcul non relié est rempli via le libellé', () => {
    const edt = [creneau({ matiere: 'Calcul mental', methode_id: null })]
    const s = genererCahierJournal(edt, progression)[0].seances[0]
    expect(s.deroulement).toContain('Nombres jusqu’à 10')
  })

  test('repli : une matière personnalisée non reliée est rapprochée par nom', () => {
    const progAnglais = [
      ...progression,
      { methode_id: 'm-en', matiere: 'anglais', items: ['Greetings'], pages: null, mots_exemple: [] },
    ]
    const edt = [creneau({ matiere: 'Anglais', methode_id: null })]
    const s = genererCahierJournal(edt, progAnglais)[0].seances[0]
    expect(s.deroulement).toContain('Greetings')
  })

  // Bug remonté par Christophe le 31/07 : « comment on peut avoir des jour 1
  // jour 2 dans la première heure du lundi ». Sa progression de français
  // importée porte des items datés (« Jour 1 : LC… », « Jour 2 : Grammaire… ») ;
  // le journal les déversait TOUS dans CHAQUE créneau de français de la semaine.
  describe('items datés « Jour N »', () => {
    const FRANCAIS_DATE = [
      { methode_id: 'm-fr', matiere: 'francais', pages: null, mots_exemple: [],
        items: [
          'Jour 1 : LC : La petite poule (S1)',
          "Jour 1 : Geste d'écriture",
          'Jour 2 : Grammaire (S1)',
          'Jour 3 : Vocabulaire (S1)',
          'Jour 4 : Langage oral',
        ] },
    ]

    // Semaine de CP sans mercredi : « Jour 3 » désigne le jeudi.
    const SEMAINE_4_JOURS = (['lundi', 'mardi', 'jeudi', 'vendredi'] as const).map((jour, i) =>
      creneau({ jour, matiere: 'Phonologie', methode_id: 'm-fr', ordre: i }))

    const deroulementPar = (jour: string) => {
      const journal = genererCahierJournal(SEMAINE_4_JOURS, FRANCAIS_DATE)
      return journal.find(j => j.jour === jour)!.seances[0].deroulement
    }

    test('le lundi ne montre que le Jour 1', () => {
      const lundi = deroulementPar('lundi')
      expect(lundi).toContain('La petite poule')
      expect(lundi).toContain("Geste d'écriture")
      expect(lundi).not.toContain('Grammaire')
      expect(lundi).not.toContain('Vocabulaire')
      expect(lundi).not.toContain('Langage oral')
    })

    test('le préfixe « Jour N » disparaît du texte affiché', () => {
      expect(deroulementPar('lundi')).not.toMatch(/jour\s*\d/i)
    })

    test('« Jour 3 » tombe le jeudi, pas le mercredi absent', () => {
      expect(deroulementPar('jeudi')).toContain('Vocabulaire')
      expect(deroulementPar('mardi')).toContain('Grammaire')
      expect(deroulementPar('vendredi')).toContain('Langage oral')
    })

    test('une progression sans item daté vaut pour toute la semaine', () => {
      // Maths, arts, EMC décrivent des notions, pas des séances : rien ne change.
      const maths = [{ methode_id: 'm-ma', matiere: 'maths', pages: null, mots_exemple: [],
        items: ['Numération : nombres jusqu’à 10', 'Calcul mental : les suivants'] }]
      const edt = (['lundi', 'mardi'] as const).map((jour, i) =>
        creneau({ jour, matiere: 'Mathématiques', methode_id: 'm-ma', ordre: i }))
      const journal = genererCahierJournal(edt, maths)
      for (const j of journal) {
        expect(j.seances[0].deroulement).toContain('Numération')
        expect(j.seances[0].deroulement).toContain('Calcul mental')
      }
    })

    test('un item non daté reste visible tous les jours, même parmi des items datés', () => {
      const melange = [{ methode_id: 'm-fr', matiere: 'francais', pages: null, mots_exemple: [],
        items: ['Jour 1 : Phonologie', 'Rituel : dictée de syllabes'] }]
      const edt = (['lundi', 'mardi'] as const).map((jour, i) =>
        creneau({ jour, matiere: 'Phonologie', methode_id: 'm-fr', ordre: i }))
      const journal = genererCahierJournal(edt, melange)
      expect(journal[0].seances[0].deroulement).toContain('dictée de syllabes')
      expect(journal[1].seances[0].deroulement).toContain('dictée de syllabes')
      expect(journal[1].seances[0].deroulement).not.toContain('Phonologie')
    })

    test('un jour hors semaine n’est jamais perdu en silence', () => {
      // « Jour 5 » sur une semaine de 4 jours : il atterrit le dernier jour EN
      // GARDANT son préfixe, pour que l'anomalie se voie au lieu de disparaître.
      const items = ['Jour 1 : A', 'Jour 5 : B']
      expect(itemsDuJour(items, 0, 4)).toEqual(['A'])
      expect(itemsDuJour(items, 3, 4)).toEqual(['Jour 5 : B'])
    })

    test('reconnaît les écritures usuelles du préfixe', () => {
      expect(numeroJourItem('Jour 2 : x')).toBe(2)
      expect(numeroJourItem('jour2- x')).toBe(2)
      expect(numeroJourItem('Jours 3 — x')).toBe(3)
      expect(numeroJourItem('Journal de bord')).toBeNull()
      expect(numeroJourItem('Lecture du jour 1')).toBeNull()
    })
  })

  test('un créneau masqué (visible_journal=false) n’apparaît pas', () => {
    const edt = [
      creneau({ matiere: 'Lecture', methode_id: 'm-fr' }),
      creneau({ matiere: 'Anglais', visible_journal: false, ordre: 1 }),
    ]
    const seances = genererCahierJournal(edt, progression)[0].seances
    expect(seances).toHaveLength(1)
    expect(seances[0].matiere).toBe('Lecture')
  })
})
