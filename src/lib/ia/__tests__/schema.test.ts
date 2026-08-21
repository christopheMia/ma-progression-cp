import { normalizeProgression, numerosSemainesFiables, PROGRESSION_JSON_SCHEMA } from '../schema'

describe('normalizeProgression', () => {
  test('conserve les numéros de semaine rendus par l’IA, en les triant', () => {
    // Renuméroter détruisait le calage : un manuel commençant en semaine 2
    // remontait en semaine 1 et toute l'année se décalait d'un cran.
    const out = normalizeProgression([
      { numero: 5, items: ['a'], pages: 'p.10', mots_exemple: ['ananas'] },
      { numero: 2, items: ['i'], pages: 'p.14', mots_exemple: [] },
    ])
    expect(out.map(s => s.numero)).toEqual([2, 5])
  })

  test('retombe sur l’ordre de la liste quand un numéro est inutilisable', () => {
    const out = normalizeProgression([
      { numero: 0, items: ['a'], pages: '', mots_exemple: [] },
      { numero: 99, items: ['i'], pages: '', mots_exemple: [] },
    ])
    expect(out.map(s => s.numero)).toEqual([1, 2])
    expect(numerosSemainesFiables([
      { numero: 0, items: ['a'], pages: '', mots_exemple: [] },
    ])).toBe(false)
  })

  test('fusionne les lignes qui portent le même numéro de semaine', () => {
    // Bug du 26/07 : les documents de maths listent souvent trois lignes pour
    // une même semaine (une par domaine, ou une par séance). L'IA rendait alors
    // trois objets « semaine 1 », et la progression affichait trois séances par
    // semaine au lieu d'une. Une semaine du document = une semaine de l'année.
    const out = normalizeProgression([
      { numero: 1, items: ['Nombres jusqu’à 10'], pages: 'p.4', mots_exemple: [] },
      { numero: 1, items: ['Comparer deux collections'], pages: 'p.5', mots_exemple: [] },
      { numero: 1, items: ['Se repérer dans l’espace'], pages: '', mots_exemple: [] },
      { numero: 2, items: ['Ajouter'], pages: 'p.8', mots_exemple: [] },
    ])

    expect(out.map(s => s.numero)).toEqual([1, 2])
    expect(out[0].items).toEqual([
      'Nombres jusqu’à 10', 'Comparer deux collections', 'Se repérer dans l’espace',
    ])
    expect(out[0].pages).toBe('p.4, p.5')
  })

  test('la fusion ne recopie pas deux fois le même apprentissage', () => {
    const out = normalizeProgression([
      { numero: 3, items: ['Le son [a]'], pages: 'p.12', mots_exemple: ['ami'] },
      { numero: 3, items: ['Le son [a]', 'Écriture du a'], pages: 'p.12', mots_exemple: ['ami', 'abri'] },
    ])

    expect(out).toHaveLength(1)
    expect(out[0].items).toEqual(['Le son [a]', 'Écriture du a'])
    expect(out[0].pages).toBe('p.12')
    expect(out[0].mots_exemple).toEqual(['ami', 'abri'])
  })

  test('les 36 semaines sont comptées APRÈS fusion, pas avant', () => {
    // Sinon un document de 36 semaines ecrit sur trois lignes chacune se
    // retrouvait ampute des deux tiers de l'annee.
    const brut = Array.from({ length: 36 }, (_, i) => i + 1).flatMap(numero => [
      { numero, items: [`a${numero}`], pages: '', mots_exemple: [] },
      { numero, items: [`b${numero}`], pages: '', mots_exemple: [] },
      { numero, items: [`c${numero}`], pages: '', mots_exemple: [] },
    ])

    const out = normalizeProgression(brut)
    expect(out).toHaveLength(36)
    expect(out[35].numero).toBe(36)
    expect(out[35].items).toEqual(['a36', 'b36', 'c36'])
  })

  test('coupe à 36 semaines maximum', () => {
    const brut = Array.from({ length: 50 }, (_, i) => ({
      numero: i + 1, items: ['a'], pages: '', mots_exemple: [],
    }))
    expect(normalizeProgression(brut)).toHaveLength(36)
  })

  test('nettoie les champs manquants ou invalides', () => {
    const out = normalizeProgression([
      { numero: 1, items: null, pages: undefined },
    ])
    // `seances` fait désormais partie de la forme rendue, toujours : un tableau
    // vide plutôt qu'un champ absent, pour qu'aucun lecteur n'ait à traiter
    // deux cas là où il n'y en a qu'un.
    expect(out[0]).toEqual({ numero: 1, items: [], pages: '', mots_exemple: [], seances: [] })
  })

  test('filtre les items vides et trim', () => {
    const out = normalizeProgression([
      { numero: 1, items: [' a ', '', 'ou'], pages: ' p.10 ', mots_exemple: [' ami ', ''] },
    ])
    expect(out[0].items).toEqual(['a', 'ou'])
    expect(out[0].pages).toBe('p.10')
    expect(out[0].mots_exemple).toEqual(['ami'])
  })

  test('le schéma JSON cible un objet { semaines: [...] } avec items', () => {
    expect(PROGRESSION_JSON_SCHEMA.type).toBe('object')
    expect(PROGRESSION_JSON_SCHEMA.properties.semaines.type).toBe('array')
    expect(PROGRESSION_JSON_SCHEMA.properties.semaines.items.properties).toHaveProperty('items')
  })
})

describe('séances rendues par l’IA', () => {
  it('conserve les séances, leur jour, leur domaine et leur libellé', () => {
    const brut = [{
      numero: 1, pages: '', mots_exemple: [], items: [],
      seances: [
        { jour: 1, domaine: 'LC', libelle: 'LC : La petite poule (séance 1)' },
        { jour: 1, domaine: '', libelle: 'Geste d’écriture' },
        { jour: 3, domaine: 'Vocabulaire', libelle: 'Vocabulaire (séance 1)' },
      ],
    }]
    const [semaine] = normalizeProgression(brut)
    expect(semaine.seances).toEqual([
      { jour: 1, domaine: 'LC', libelle: 'LC : La petite poule (séance 1)' },
      { jour: 1, domaine: '', libelle: 'Geste d’écriture' },
      { jour: 3, domaine: 'Vocabulaire', libelle: 'Vocabulaire (séance 1)' },
    ])
    expect(semaine.items).toEqual([
      'Jour 1 : LC : La petite poule (séance 1)',
      'Jour 1 : Geste d’écriture',
      'Jour 3 : Vocabulaire (séance 1)',
    ])
  })

  it('remplit items depuis les séances pour l’affichage existant', () => {
    const brut = [{
      numero: 1, pages: '', mots_exemple: [], items: [],
      seances: [{ jour: 2, domaine: '', libelle: 'Grammaire' }],
    }]
    expect(normalizeProgression(brut)[0].items).toEqual(['Jour 2 : Grammaire'])
  })

  it('retombe sur items quand le modèle ne rend pas de séances', () => {
    const brut = [{ numero: 1, items: ['Jour 2 : Grammaire'], pages: '', mots_exemple: [] }]
    // Valeur métier attendue, écrite en dur : comparer à seancesDepuisItems()
    // reviendrait à comparer le code à lui-même, et le test resterait vert si
    // la conversion devenait fausse.
    expect(normalizeProgression(brut)[0].seances).toEqual([
      { jour: 2, domaine: '', libelle: 'Grammaire' },
    ])
  })

  // LE DÉFAUT LE PLUS GRAVE, relevé le 20/08 : une seule séance rendue par le
  // modèle régénérait items en entier, donc effaçait tout apprentissage que le
  // modèle avait oublié de reprendre en séance. Le document de l'enseignante
  // perdait trois lignes sur quatre, sans un mot.
  it('complète items au lieu de l’écraser quand le modèle n’a rendu qu’une séance', () => {
    const brut = [{
      numero: 1,
      items: ['LC : la poule', 'Geste : a', 'Vocabulaire : émotions', 'Fluence : syllabes'],
      pages: '', mots_exemple: [],
      seances: [{ jour: 1, domaine: 'LC', libelle: 'LC : la poule' }],
    }]
    const [semaine] = normalizeProgression(brut)
    expect(semaine.items).toEqual([
      'Jour 1 : LC : la poule',
      'Geste : a',
      'Vocabulaire : émotions',
      'Fluence : syllabes',
    ])
    // Les rescapés deviennent des séances : items et seances ne se
    // contredisent jamais.
    expect(semaine.seances).toEqual([
      { jour: 1, domaine: 'LC', libelle: 'LC : la poule' },
      { jour: null, domaine: 'Geste', libelle: 'Geste : a' },
      { jour: null, domaine: 'Vocabulaire', libelle: 'Vocabulaire : émotions' },
      { jour: null, domaine: 'Fluence', libelle: 'Fluence : syllabes' },
    ])
  })

  it('ne recopie pas un item que la séance couvre déjà, préfixe compris', () => {
    const brut = [{
      numero: 1, items: ['Jour 2 : Grammaire'], pages: '', mots_exemple: [],
      seances: [{ jour: 2, domaine: '', libelle: 'Grammaire' }],
    }]
    const [semaine] = normalizeProgression(brut)
    expect(semaine.seances).toHaveLength(1)
    expect(semaine.items).toEqual(['Jour 2 : Grammaire'])
  })

  it('n’écrit pas « Jour 3 : 4 : révisions » à partir de « Jours 3-4 : révisions »', () => {
    const brut = [{ numero: 1, items: ['Jours 3-4 : révisions'], pages: '', mots_exemple: [] }]
    const [semaine] = normalizeProgression(brut)
    expect(semaine.items).toEqual(['Jours 3-4 : révisions'])
    expect(semaine.seances).toEqual([
      { jour: null, domaine: 'Jours 3-4', libelle: 'Jours 3-4 : révisions' },
    ])
  })

  it('retrouve le jour laissé à null quand le libellé porte le préfixe', () => {
    const brut = [{
      numero: 1, items: [], pages: '', mots_exemple: [],
      seances: [{ jour: null, domaine: '', libelle: 'Jour 3 : Fluence' }],
    }]
    // Le même contenu arrivé par items aurait donné jour 3 : les deux chemins
    // doivent dire la même chose.
    expect(normalizeProgression(brut)[0].seances).toEqual([
      { jour: 3, domaine: '', libelle: 'Fluence' },
    ])
  })

  it('retire le préfixe du libellé, comme le contrat du type l’annonce', () => {
    const brut = [{
      numero: 1, items: [], pages: '', mots_exemple: [],
      seances: [{ jour: 3, domaine: '', libelle: 'Jour 3 : LC : la poule' }],
    }]
    const [semaine] = normalizeProgression(brut)
    expect(semaine.seances).toEqual([{ jour: 3, domaine: 'LC', libelle: 'LC : la poule' }])
    expect(semaine.items).toEqual(['Jour 3 : LC : la poule'])
  })

  it('filtre une séance sans libellé, une case vide n’est pas une séance', () => {
    const brut = [{
      numero: 1, items: [], pages: '', mots_exemple: [],
      seances: [
        { jour: 1, domaine: 'LC', libelle: '   ' },
        { jour: 1, domaine: '', libelle: 'Fluence' },
      ],
    }]
    expect(normalizeProgression(brut)[0].seances).toEqual([
      { jour: 1, domaine: '', libelle: 'Fluence' },
    ])
  })

  // La chaîne complète du défaut : le modèle recopie l'en-tête d'une case vide,
  // le libellé se réduit à son préfixe, et le cahier journal affichait un
  // créneau VIDE au lieu du nom de sa matière (`itemsDuJour` rendait [''], donc
  // le repli sur `creneau.matiere` ne se déclenchait pas).
  it('filtre une séance réduite à son préfixe de jour, sans laisser d’item vide', () => {
    const brut = [{
      numero: 1, items: [], pages: '', mots_exemple: [],
      seances: [
        { jour: null, domaine: 'LC', libelle: 'Jour 4 :' },
        { jour: 1, domaine: '', libelle: 'Fluence' },
      ],
    }]
    const [semaine] = normalizeProgression(brut)
    expect(semaine.seances).toEqual([{ jour: 1, domaine: '', libelle: 'Fluence' }])
    expect(semaine.items).toEqual(['Jour 1 : Fluence'])
  })

  // BLOQUANT 2 : le modèle obéissait à deux règles contradictoires du prompt
  // (« Domaine : contenu » dans items, texte de la puce dans libelle) et la
  // semaine ressortait avec quatre séances pour deux puces.
  it('ne compte pas deux fois une puce écrite avec et sans son domaine', () => {
    const brut = [{
      numero: 1,
      items: ['LC : Décodage des syllabes', 'Vocabulaire : les animaux de la ferme'],
      pages: '', mots_exemple: [],
      seances: [
        { jour: 1, domaine: 'LC', libelle: 'Décodage des syllabes' },
        { jour: 2, domaine: 'Vocabulaire', libelle: 'les animaux de la ferme' },
      ],
    }]
    const [semaine] = normalizeProgression(brut)
    expect(semaine.seances).toHaveLength(2)
    expect(semaine.items).toEqual([
      'Jour 1 : LC : Décodage des syllabes',
      'Jour 2 : Vocabulaire : les animaux de la ferme',
    ])
  })

  it('ne compte pas deux fois une puce écrite à un accent ou un point près', () => {
    const brut = [{
      numero: 1,
      items: ['Découverte du son [a].', 'Ecriture'],
      pages: '', mots_exemple: [],
      seances: [
        { jour: 1, domaine: '', libelle: 'Découverte du son [a]' },
        { jour: 2, domaine: '', libelle: 'Écriture' },
      ],
    }]
    expect(normalizeProgression(brut)[0].seances).toHaveLength(2)
  })

  // BLOQUANT 1 : le garde-fou d'intervalle manquait sur le chemin
  // `itemsDepuisSeances`, et le nombre de puces grandissait à chaque passage.
  it('n’ajoute pas une puce à chaque passage quand le modèle date un intervalle', () => {
    const brut = [{
      numero: 1, items: ['Jours 3-4 : révisions'], pages: '', mots_exemple: [],
      seances: [{ jour: 3, domaine: '', libelle: 'Jours 3-4 : révisions' }],
    }]
    const une = normalizeProgression(brut)
    expect(une[0].items).toEqual(['Jours 3-4 : révisions'])
    expect(une[0].seances).toHaveLength(1)
    expect(normalizeProgression(normalizeProgression(normalizeProgression(une)))).toEqual(une)
  })

  it('garde l’ordre de lecture du document quand le modèle n’a rendu que la dernière puce', () => {
    const brut = [{
      numero: 1,
      items: ['Fluence', 'Dictée', 'Copie', 'Graphisme'],
      pages: '', mots_exemple: [],
      seances: [{ jour: 4, domaine: '', libelle: 'Graphisme' }],
    }]
    expect(normalizeProgression(brut)[0].items).toEqual([
      'Fluence', 'Dictée', 'Copie', 'Jour 4 : Graphisme',
    ])
  })

  it('garde le jour écrit dans l’item contre celui rendu par le modèle', () => {
    const brut = [{
      numero: 1, items: ['Jour 2 : Dictée'], pages: '', mots_exemple: [],
      seances: [{ jour: 1, domaine: '', libelle: 'Dictée' }],
    }]
    const [semaine] = normalizeProgression(brut)
    expect(semaine.seances).toEqual([{ jour: 2, domaine: '', libelle: 'Dictée' }])
    expect(semaine.items).toEqual(['Jour 2 : Dictée'])
  })

  it('ignore un champ seances qui n’est pas un tableau, sans perdre les items', () => {
    const brut = [{
      numero: 1, items: ['Jour 2 : Grammaire'], pages: '', mots_exemple: [],
      seances: 'Jour 2 : Grammaire',
    }]
    const [semaine] = normalizeProgression(brut)
    expect(semaine.seances).toEqual([{ jour: 2, domaine: '', libelle: 'Grammaire' }])
    expect(semaine.items).toEqual(['Jour 2 : Grammaire'])
  })

  it('garde deux séances de même libellé sur la même ligne', () => {
    // Deux puces identiques dans deux colonnes-jours sont deux séances à
    // placer dans deux créneaux, jamais une répétition à effacer.
    const brut = [{
      numero: 1, items: [], pages: '', mots_exemple: [],
      seances: [
        { jour: 1, domaine: '', libelle: 'Geste d’écriture' },
        { jour: 3, domaine: '', libelle: 'Geste d’écriture' },
      ],
    }]
    const [semaine] = normalizeProgression(brut)
    expect(semaine.seances).toHaveLength(2)
    expect(semaine.items).toEqual(['Jour 1 : Geste d’écriture', 'Jour 3 : Geste d’écriture'])
  })

  it('concatène les séances de deux lignes portant la même semaine, sans les fusionner', () => {
    const brut = [
      { numero: 1, items: [], pages: '', mots_exemple: [],
        seances: [{ jour: 1, domaine: 'Nombres', libelle: 'Nombres : jusqu’à 5' }] },
      { numero: 1, items: [], pages: '', mots_exemple: [],
        seances: [{ jour: 1, domaine: 'Calcul', libelle: 'Calcul : doubles' }] },
    ]
    const semaines = normalizeProgression(brut)
    expect(semaines).toHaveLength(1)
    expect(semaines[0].seances).toEqual([
      { jour: 1, domaine: 'Nombres', libelle: 'Nombres : jusqu’à 5' },
      { jour: 1, domaine: 'Calcul', libelle: 'Calcul : doubles' },
    ])
    expect(semaines[0].items).toEqual(['Jour 1 : Nombres : jusqu’à 5', 'Jour 1 : Calcul : doubles'])
  })

  it('garde le même libellé sur deux lignes de la même semaine, sans le fusionner', () => {
    const brut = [
      { numero: 1, items: [], pages: '', mots_exemple: [],
        seances: [{ jour: 1, domaine: '', libelle: 'Geste d’écriture' }] },
      { numero: 1, items: [], pages: '', mots_exemple: [],
        seances: [{ jour: 3, domaine: '', libelle: 'Geste d’écriture' }] },
    ]
    expect(normalizeProgression(brut)[0].seances).toEqual([
      { jour: 1, domaine: '', libelle: 'Geste d’écriture' },
      { jour: 3, domaine: '', libelle: 'Geste d’écriture' },
    ])
  })

  // Le schéma est le second endroit que le modèle lit, après le prompt : un
  // champ sans description est un champ qu'il remplit au jugé.
  it('décrit les trois champs d’une séance dans le schéma JSON', () => {
    const seance = PROGRESSION_JSON_SCHEMA.properties.semaines.items.properties.seances.items
    // Vérifier que la description du champ « jour » contient le mot « jour »
    // laissait passer n'importe quelle description fausse. Ce sont les RÈGLES
    // qui comptent, celles-là mêmes que le prompt énonce.
    expect(seance.properties.jour.description).toMatch(/rang du jour/i)
    expect(seance.properties.jour.description).toMatch(/null/)
    expect(seance.properties.jour.description).toMatch(/n[’']invente aucun jour/i)
    expect(seance.properties.jour.description).toMatch(/plusieurs jours/i)
    expect(seance.properties.jour.description).toMatch(/séance 2/i)
    expect(seance.properties.domaine.description).toMatch(/en-tête de colonne/i)
    expect(seance.properties.domaine.description).toMatch(/""/)
    expect(seance.properties.libelle.description).toMatch(/texte exact de la puce/i)
    expect(seance.properties.libelle.description).toMatch(/sans le préfixe/i)
    expect(seance.properties.libelle.description).toMatch(/mot pour mot/i)
  })

  it('renormaliser sa propre sortie ne la change plus', () => {
    const brut = [{
      numero: 1,
      items: ['LC : la poule', 'Geste : a', 'Jours 3-4 : révisions'],
      pages: 'p.4', mots_exemple: ['ami'],
      seances: [
        { jour: 1, domaine: 'LC', libelle: 'LC : la poule' },
        { jour: null, domaine: '', libelle: 'Jour 2 : Fluence' },
      ],
    }]
    const une = normalizeProgression(brut)
    const deux = normalizeProgression(une)
    expect(deux).toEqual(une)
    const trois = normalizeProgression(deux)
    expect(trois).toEqual(une)
    expect(normalizeProgression(trois)).toEqual(une)
  })

  // LA VÉRITÉ MESURÉE (21/08) sur le seul cas qui ne converge PAS dès le
  // premier passage : deux lignes de la même semaine dont les séances rendent
  // le même texte d'item. `items` se dédoublonne à la fusion (comportement du
  // 26/07), `seances` non (règle de cette tâche). Le second passage rétablit
  // l'item manquant, donc RAJOUTE le doublon : l'enseignante voit la séance
  // deux fois, ce qui défait la règle du 26/07 avec un tour de retard. La
  // conversion est stable à partir du deuxième passage, elle n'oscille pas,
  // mais son point fixe n'est pas sa première sortie.
  it('se stabilise au second passage EN AJOUTANT le doublon des lignes fusionnées', () => {
    const brut = [
      { numero: 1, items: [], pages: '', mots_exemple: [],
        seances: [{ jour: 1, domaine: '', libelle: 'Geste d’écriture' }] },
      { numero: 1, items: [], pages: '', mots_exemple: [],
        seances: [{ jour: 1, domaine: '', libelle: 'Geste d’écriture' }] },
    ]
    const une = normalizeProgression(brut)
    expect(une[0].seances).toHaveLength(2)
    expect(une[0].items).toEqual(['Jour 1 : Geste d’écriture'])

    const deux = normalizeProgression(une)
    expect(deux[0].items).toEqual(['Jour 1 : Geste d’écriture', 'Jour 1 : Geste d’écriture'])
    const trois = normalizeProgression(deux)
    expect(trois).toEqual(deux)
    expect(normalizeProgression(trois)).toEqual(deux)
  })

  // À CORRIGER 4 : la branche de repli sur `items` bruts était encore
  // atteignable. Quand TOUS les items d'une semaine se réduisent à un préfixe,
  // aucune séance ne survit et `items` ressortait tel quel. Le cahier journal
  // affichait alors un créneau VIDE au lieu du nom de sa matière : `itemsDuJour`
  // rendait [''], donc `retenus.length` valait 1 et le repli ne se déclenchait
  // pas. Les tests d'alors mettaient toujours une séance valide à côté, ce qui
  // masquait la branche.
  it('ne laisse pas passer un item réduit à son seul préfixe de jour', () => {
    const brut = [{ numero: 1, items: ['Jour 4 :'], pages: '', mots_exemple: [], seances: [] }]
    const [semaine] = normalizeProgression(brut)
    expect(semaine.seances).toEqual([])
    expect(semaine.items).toEqual([])
  })

  it('ne garde aucun item quand aucune puce de la semaine n’a de texte', () => {
    const brut = [{
      numero: 1, pages: '', mots_exemple: [],
      items: ['Jour 1 :', 'Jour 2 :  '],
      seances: [{ jour: null, domaine: 'LC', libelle: 'Jour 3 :' }],
    }]
    expect(normalizeProgression(brut)[0].items).toEqual([])
  })

  // À CORRIGER 7 : `CHAT_SCHEMA` (src/app/api/ia-chat/route.ts) ne connaît pas
  // le champ `seances`, et la route rappelle `normalizeProgression` sur une
  // progression déjà normalisée. Un tour de chat reconstruit donc les séances
  // depuis `items` SEULS. Vu la décision de Christophe sur le domaine, cet
  // aller-retour doit être sans perte : le jour, le domaine, le texte et
  // l'ordre des puces vivent tous dans `items` et se relisent.
  it('survit à un aller-retour par ia-chat, qui ne rend que les items', () => {
    const brut = [{
      numero: 1, pages: 'p.4', mots_exemple: ['ami'],
      items: [],
      seances: [
        { jour: 1, domaine: 'LC', libelle: 'La petite poule (séance 1)' },
        { jour: 1, domaine: '', libelle: 'Geste d’écriture' },
        { jour: 2, domaine: 'PDE', libelle: 'Voyelles, de Rimbaud (séance 1)' },
        { jour: null, domaine: 'Vocabulaire', libelle: 'Vocabulaire (séance 3)' },
      ],
    }]
    const avant = normalizeProgression(brut)
    // Ce que le modèle du chat peut rendre : le schéma ne l'autorise pas à
    // reprendre `seances`, il ne renvoie que `items` (ici inchangés).
    const rendu = avant.map(({ seances: _seances, ...reste }) => reste)
    const apres = normalizeProgression(rendu)

    expect(apres[0].items).toEqual(avant[0].items)
    expect(apres[0].seances?.map(s => s.jour)).toEqual(avant[0].seances?.map(s => s.jour))
    // Le texte de chaque puce, domaine compris, traverse l'aller-retour entier :
    // c'est lui que l'enseignante lit, et c'est lui qui ne doit rien perdre.
    expect(apres[0].seances?.map(s => s.libelle)).toEqual(avant[0].seances?.map(s => s.libelle))
    // Le CHAMP `domaine`, lui, ne se redérive que si le document écrit son
    // domaine avant des deux points. « Vocabulaire (séance 3) » n'en met pas :
    // le mot reste dans le texte, donc à l'écran, mais le champ retombe à "".
    // Limite connue de `domaineDe`, sans conséquence sur ce qui est affiché.
    expect(apres[0].seances?.map(s => s.domaine)).toEqual(['LC', '', 'PDE', ''])
    expect(apres[0].items).toEqual([
      'Jour 1 : LC : La petite poule (séance 1)',
      'Jour 1 : Geste d’écriture',
      'Jour 2 : PDE : Voyelles, de Rimbaud (séance 1)',
      'Vocabulaire (séance 3)',
    ])
  })
})
