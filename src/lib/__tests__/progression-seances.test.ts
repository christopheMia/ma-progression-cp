import {
  seancesDepuisItems,
  itemsDepuisSeances,
  seanceDepuisTexte,
  completerSeances,
} from '../progression-seances'

describe('seancesDepuisItems', () => {
  it('lit le jour dans le préfixe et le retire du libellé', () => {
    expect(seancesDepuisItems(['Jour 2 : Grammaire'])).toEqual([
      { jour: 2, domaine: '', libelle: 'Grammaire' },
    ])
  })

  it('laisse jour à null quand il n’y a pas de préfixe', () => {
    expect(seancesDepuisItems(['Nombres jusqu’à 10'])).toEqual([
      { jour: null, domaine: '', libelle: 'Nombres jusqu’à 10' },
    ])
  })

  it('ne prend pas le « (séance 3) » du document pour un jour', () => {
    expect(seancesDepuisItems(['LC : La petite poule (séance 3)'])).toEqual([
      { jour: null, domaine: 'LC', libelle: 'LC : La petite poule (séance 3)' },
    ])
  })

  it('garde le domaine écrit avant les deux points', () => {
    expect(seancesDepuisItems(['Jour 1 : Vocabulaire : les émotions'])).toEqual([
      { jour: 1, domaine: 'Vocabulaire', libelle: 'Vocabulaire : les émotions' },
    ])
  })

  it('ignore les entrées vides', () => {
    expect(seancesDepuisItems(['', '   '])).toEqual([])
  })

  // BLOQUANT 1 : un numéro de jour rejeté (0, ou toute valeur non valide) ne
  // doit pas faire disparaître le préfixe du libellé, sinon l'aller-retour
  // avec itemsDepuisSeances perd du texte écrit par l'enseignante.
  it('rejette « Jour 0 » comme numéro de jour mais ne retire pas le préfixe du libellé', () => {
    expect(seancesDepuisItems(['Jour 0 : Rentrée'])).toEqual([
      { jour: null, domaine: 'Jour 0', libelle: 'Jour 0 : Rentrée' },
    ])
  })

  it('rejette un jour 0 sans perdre de texte à l’aller-retour avec itemsDepuisSeances', () => {
    const items = ['Jour 0 : Rentrée']
    expect(itemsDepuisSeances(seancesDepuisItems(items))).toEqual(items)
  })

  it('reconnaît le préfixe en majuscules', () => {
    expect(seancesDepuisItems(['JOUR 2 : Grammaire'])).toEqual([
      { jour: 2, domaine: '', libelle: 'Grammaire' },
    ])
  })

  it.each([
    ['deux points', 'Jour 2 : x'],
    ['point', 'Jour 2. x'],
    ['tiret simple', 'Jour 2- x'],
    ['tiret demi-cadratin U+2013', 'Jour 2– x'],
  ])('reconnaît le séparateur %s', (_nom, item) => {
    expect(seancesDepuisItems([item])).toEqual([{ jour: 2, domaine: '', libelle: 'x' }])
  })

  // Le tiret cadratin U+2014 est un séparateur accepté par la regex (voir la
  // classe de caractères de PREFIXE_JOUR), au même titre que les autres. On
  // construit le caractère par son code point plutôt que de l'écrire en
  // toutes lettres dans ce fichier de test, pour respecter la règle du dépôt
  // qui bannit le tiret cadratin partout sauf dans la classe de caractères
  // du regex lui-même.
  it('reconnaît le séparateur tiret cadratin U+2014', () => {
    const tiretCadratin = String.fromCharCode(0x2014)
    expect(seancesDepuisItems([`Jour 2${tiretCadratin} x`])).toEqual([
      { jour: 2, domaine: '', libelle: 'x' },
    ])
  })

  it('reconnaît un numéro de jour à deux chiffres', () => {
    expect(seancesDepuisItems(['Jour 12 : x'])).toEqual([{ jour: 12, domaine: '', libelle: 'x' }])
  })

  it('reconnaît un espace insécable (U+00A0) en tête d’item', () => {
    expect(seancesDepuisItems([' Jour 2 : x'])).toEqual([{ jour: 2, domaine: '', libelle: 'x' }])
  })

  it('reconnaît un espace insécable (U+00A0) entre le mot et le numéro, pas seulement en tête', () => {
    // trim() en tête ne prouve rien sur s : ce cas place l'insécable A L'INTERIEUR du prefixe,
    // la ou seule la regex peut le reconnaitre.
    expect(seancesDepuisItems(['Jour 2 : x'])).toEqual([{ jour: 2, domaine: '', libelle: 'x' }])
  })

  it('accepte un domaine de 30 caractères, la borne haute', () => {
    const domaine = 'A'.repeat(30)
    expect(seancesDepuisItems([`${domaine}: x`])).toEqual([
      { jour: null, domaine, libelle: `${domaine}: x` },
    ])
  })

  it('rejette un domaine de 31 caractères, un cran au-delà de la borne', () => {
    const domaine = 'A'.repeat(31)
    expect(seancesDepuisItems([`${domaine}: x`])).toEqual([
      { jour: null, domaine: '', libelle: `${domaine}: x` },
    ])
  })

  // Le critère est le sens, pas la littéralité. Un nombre EST du contenu :
  // converti en texte plutôt que supprimé, pour ne jamais perdre
  // silencieusement ce qui pourrait être une séance.
  it('convertit un nombre de la colonne JSONB en texte au lieu de le supprimer', () => {
    expect(seancesDepuisItems([42] as unknown[])).toEqual([
      { jour: null, domaine: '', libelle: '42' },
    ])
  })

  // Un null ou un undefined n'est PAS du texte écrit par l'enseignante,
  // c'est une absence : il se filtre comme une entrée vide plutôt que de
  // s'afficher en toutes lettres ("null") dans un cahier journal.
  it('filtre un null ou un undefined de la colonne JSONB comme une entrée vide', () => {
    expect(seancesDepuisItems([null, undefined, 'Jour 2 : x'] as unknown[])).toEqual([
      { jour: 2, domaine: '', libelle: 'x' },
    ])
  })

  it('ne jette pas quand items est absent ou null', () => {
    expect(seancesDepuisItems(null)).toEqual([])
    expect(seancesDepuisItems(undefined)).toEqual([])
  })
})

describe('itemsDepuisSeances', () => {
  it('remet le préfixe de jour pour que l’ancien affichage reste identique', () => {
    expect(itemsDepuisSeances([
      { jour: 2, domaine: '', libelle: 'Grammaire' },
      { jour: null, domaine: '', libelle: 'Nombres jusqu’à 10' },
    ])).toEqual(['Jour 2 : Grammaire', 'Nombres jusqu’à 10'])
  })

  it('fait l’aller-retour sans rien perdre', () => {
    const items = ['Jour 1 : LC : La petite poule (séance 1)', 'Jour 3 : Fluence']
    expect(itemsDepuisSeances(seancesDepuisItems(items))).toEqual(items)
  })

  // BLOQUANT 2 : jour et libelle sont remplis séparément par l'IA, qui recopie
  // volontiers la puce entière dans libelle. La fonction doit rester idempotente.
  it('ne double pas le préfixe quand le libellé en porte déjà un', () => {
    expect(itemsDepuisSeances([{ jour: 3, domaine: '', libelle: 'Jour 3 : Fluence' }])).toEqual([
      'Jour 3 : Fluence',
    ])
  })

  it('fait l’aller-retour dans l’autre sens sans rien perdre (seances -> items -> seances)', () => {
    const seances = [
      { jour: 2, domaine: '', libelle: 'Grammaire' },
      { jour: null, domaine: 'LC', libelle: 'LC : La petite poule (séance 1)' },
    ]
    expect(seancesDepuisItems(itemsDepuisSeances(seances))).toEqual(seances)
  })

  it('teste la validité du jour (entier strictement positif), pas sa véracité JS', () => {
    expect(itemsDepuisSeances([{ jour: 2.5, domaine: '', libelle: 'x' }])).toEqual(['x'])
    expect(itemsDepuisSeances([{ jour: 0, domaine: '', libelle: 'Rentrée' }])).toEqual(['Rentrée'])
    expect(itemsDepuisSeances([{ jour: -1, domaine: '', libelle: 'x' }])).toEqual(['x'])
  })
})

// Un intervalle de jours (« Jours 3-4 ») ne désigne aucun rang de jour unique.
// Avant la règle du 20/08, PREFIXE_JOUR le charcutait : le tiret d'un
// intervalle est le même caractère que l'un des séparateurs du préfixe, donc
// « Jours 3-4 : révisions » sortait en jour 3 + libellé « 4 : révisions », et
// l'aller-retour par itemsDepuisSeances réécrivait la puce en
// « Jour 3 : 4 : révisions ». Du texte de l'enseignante, déformé.
describe('intervalles de jours', () => {
  it('laisse « Jours 3-4 : révisions » intact, sans jour', () => {
    expect(seancesDepuisItems(['Jours 3-4 : révisions'])).toEqual([
      { jour: null, domaine: 'Jours 3-4', libelle: 'Jours 3-4 : révisions' },
    ])
  })

  it.each([
    ['tiret collé', 'Jours 3-4 : révisions'],
    ['tiret espacé', 'Jour 3 - 4 : révisions'],
    ['tiret demi-cadratin U+2013', 'Jours 3\u20134 : révisions'],
    ['tiret cadratin U+2014', `Jours 3${String.fromCharCode(0x2014)}4 : révisions`],
    ['« et »', 'Jours 3 et 4 : révisions'],
    ['« à »', 'Jours 3 à 4 : révisions'],
    ['virgule', 'Jours 3, 4 : révisions'],
    // Le point manquait à LIAISONS_INTERVALLE alors que PREFIXE_JOUR l'accepte
    // comme séparateur : ces trois formes sortaient en « Jour 3 : 4 : révisions ».
    ['point collé', 'Jour 3.4 : révisions'],
    ['point collé au pluriel', 'Jours 3.4 : révisions'],
    ['point espacé', 'Jour 3. 4 : révisions'],
    ['trois jours au tiret', 'Jours 3-4-5 : révisions'],
    ['trois jours en toutes lettres', 'Jours 3 et 4 et 5 : révisions'],
    ['majuscules', 'JOURS 3-4 : révisions'],
  ])('ne date pas et ne déforme pas la forme %s', (_nom, item) => {
    const [seance] = seancesDepuisItems([item])
    expect(seance.jour).toBeNull()
    expect(seance.libelle).toBe(item)
  })

  it('fait l’aller-retour sans déformer la puce', () => {
    const items = ['Jours 3-4 : révisions']
    expect(itemsDepuisSeances(seancesDepuisItems(items))).toEqual(items)
  })

  // La règle ne doit pas déborder : un vrai préfixe de jour suivi d'un libellé
  // qui commence par un chiffre reste un jour.
  it('ne prend pas « Jour 3 : 4 opérations » pour un intervalle', () => {
    expect(seancesDepuisItems(['Jour 3 : 4 opérations'])).toEqual([
      { jour: 3, domaine: '', libelle: '4 opérations' },
    ])
  })

  // BLOQUANT 1 de la relecture du 21/08 : le garde-fou n'était consulté que par
  // seanceDepuisTexte. Dès que le modèle remplissait `jour` lui-même, ce que le
  // prompt lui demande, l'autre conversion (itemsDepuisSeances) rouvrait la
  // régression, et le doublon grossissait à chaque passage.
  it('ne date pas un intervalle, même quand le modèle rend un jour à côté', () => {
    expect(seanceDepuisTexte('Jours 3-4 : révisions', 3)).toEqual({
      jour: null, domaine: 'Jours 3-4', libelle: 'Jours 3-4 : révisions',
    })
  })

  it('ne déforme pas un intervalle quand le jour vient du champ et non du texte', () => {
    expect(itemsDepuisSeances([{ jour: 3, domaine: '', libelle: 'Jours 3-4 : révisions' }]))
      .toEqual(['Jours 3-4 : révisions'])
  })

  it('ne fabrique pas une puce de plus à chaque renormalisation', () => {
    const items = ['Jours 3-4 : révisions']
    const seances = [{ jour: 3, domaine: '', libelle: 'Jours 3-4 : révisions' }]
    const un = completerSeances(seances, items)
    expect(itemsDepuisSeances(un)).toEqual(items)
    const deux = completerSeances(un, itemsDepuisSeances(un))
    expect(deux).toEqual(un)
    const trois = completerSeances(deux, itemsDepuisSeances(deux))
    expect(trois).toEqual(un)
  })
})

describe('seanceDepuisTexte', () => {
  it('retire le préfixe du libellé et en tire le jour', () => {
    expect(seanceDepuisTexte('Jour 3 : LC : la poule')).toEqual({
      jour: 3, domaine: 'LC', libelle: 'LC : la poule',
    })
  })

  // CORRIGÉ le 21/08 (point 6 de la relecture). Le jour du modèle écrasait le
  // préfixe écrit dans le texte SANS UN MOT : « Jour 3 : Fluence » avec
  // jour: 5 ressortait au jour 5, et le « 3 » du document disparaissait. C'est
  // « signaler, jamais deviner » : le texte de la puce tranche, le champ du
  // modèle ne sert que là où le texte se tait (le cas courant, le prompt lui
  // demandant un libellé sans préfixe).
  it('laisse le préfixe écrit dans le texte trancher contre le jour du modèle', () => {
    expect(seanceDepuisTexte('Jour 3 : Fluence', 5)).toEqual({
      jour: 3, domaine: '', libelle: 'Fluence',
    })
  })

  it('garde le jour du modèle quand le texte ne dit rien de la journée', () => {
    expect(seanceDepuisTexte('Fluence', 5)).toEqual({
      jour: 5, domaine: '', libelle: 'Fluence',
    })
  })

  // Une case vide dont le modèle recopie l'en-tête : sans ce filtre, la chaîne
  // rendait « Jour 4 : » puis un créneau VIDE dans le cahier journal.
  it('ne rend rien pour une puce réduite à son préfixe de jour', () => {
    expect(seanceDepuisTexte('Jour 4 :')).toBeNull()
    expect(seanceDepuisTexte('Jour 4 : ', null, 'LC')).toBeNull()
    expect(seancesDepuisItems(['Jour 4 :'])).toEqual([])
  })

  it('retombe sur le jour du préfixe quand celui du modèle ne vaut rien', () => {
    expect(seanceDepuisTexte('Jour 3 : Fluence', 0)?.jour).toBe(3)
    expect(seanceDepuisTexte('Jour 3 : Fluence', null)?.jour).toBe(3)
    expect(seanceDepuisTexte('Jour 3 : Fluence', 2.5)?.jour).toBe(3)
  })

  it('garde le domaine du modèle quand il en donne un, sinon le dérive du libellé', () => {
    expect(seanceDepuisTexte('La petite poule', null, 'Lecture')?.domaine).toBe('Lecture')
    expect(seanceDepuisTexte('Vocabulaire : les émotions')?.domaine).toBe('Vocabulaire')
  })

  it('ne rend rien pour un texte vide', () => {
    expect(seanceDepuisTexte('   ')).toBeNull()
  })
})

// completerSeances est le garde-fou anti-destruction : les items que le modèle
// n'a pas repris en séance survivent, et deviennent des séances à leur tour,
// pour que items et seances ne se contredisent jamais.
describe('completerSeances', () => {
  it('garde les items qu’aucune séance ne couvre et en fait des séances', () => {
    const seances = [{ jour: 1, domaine: 'LC', libelle: 'LC : la poule' }]
    const items = ['LC : la poule', 'Geste : a', 'Vocabulaire : émotions', 'Fluence : syllabes']
    expect(completerSeances(seances, items)).toEqual([
      { jour: 1, domaine: 'LC', libelle: 'LC : la poule' },
      { jour: null, domaine: 'Geste', libelle: 'Geste : a' },
      { jour: null, domaine: 'Vocabulaire', libelle: 'Vocabulaire : émotions' },
      { jour: null, domaine: 'Fluence', libelle: 'Fluence : syllabes' },
    ])
  })

  it('reconnaît un item déjà couvert, que le préfixe de jour y soit ou non', () => {
    const seances = [{ jour: 1, domaine: '', libelle: 'Fluence' }]
    expect(completerSeances(seances, ['Jour 1 : Fluence'])).toEqual(seances)
    expect(completerSeances(seances, ['Fluence'])).toEqual(seances)
  })

  it('reconnaît un item couvert malgré les espaces en trop ou insécables', () => {
    const seances = [{ jour: 1, domaine: 'LC', libelle: 'LC : la poule' }]
    expect(completerSeances(seances, ['  LC :  la\u00a0poule  '])).toEqual(seances)
  })

  it('garde un item répété autant de fois qu’il est écrit', () => {
    // Le modèle n'a vu qu'une séance là où le document porte deux puces
    // identiques : la seconde puce reste une séance, elle ne s'évapore pas.
    const seances = [{ jour: 1, domaine: '', libelle: 'Geste d’écriture' }]
    expect(completerSeances(seances, ['Geste d’écriture', 'Geste d’écriture'])).toEqual([
      { jour: 1, domaine: '', libelle: 'Geste d’écriture' },
      { jour: null, domaine: '', libelle: 'Geste d’écriture' },
    ])
  })

  it('rend les séances des items quand le modèle n’en rend aucune', () => {
    expect(completerSeances([], ['Jour 2 : Grammaire'])).toEqual([
      { jour: 2, domaine: '', libelle: 'Grammaire' },
    ])
  })

  it('ne jette pas quand items est absent', () => {
    expect(completerSeances([], null)).toEqual([])
    expect(completerSeances([], undefined)).toEqual([])
  })

  it('ne garde pas une séance réduite à son préfixe de jour', () => {
    expect(completerSeances([{ jour: null, domaine: 'LC', libelle: 'Jour 4 :' }], [])).toEqual([])
  })
})

// BLOQUANT 2 de la relecture du 21/08. La comparaison exigeait du modèle une
// perfection au caractère près que le prompt ne demandait pas : une même puce
// écrite « LC : Décodage » dans items et « Décodage » dans seances donnait
// DEUX séances. C'est « les maths en triple » du 26/07 qui revenait par une
// autre porte. La frontière exacte est documentée sur `normaliserTexte` :
// la FORME est tolérée, le CONTENU jamais.
describe('frontière de tolérance : ce qui est la même puce', () => {
  it('reconnaît la même puce écrite avec son domaine devant', () => {
    const seances = [
      { jour: 1, domaine: 'LC', libelle: 'Décodage des syllabes' },
      { jour: 2, domaine: 'Vocabulaire', libelle: 'les animaux de la ferme' },
    ]
    const items = ['LC : Décodage des syllabes', 'Vocabulaire : les animaux de la ferme']
    const out = completerSeances(seances, items)
    expect(out).toHaveLength(2)
    // Des deux écritures, celle qui porte le plus du texte de l'enseignante est
    // gardée : le domaine reste visible à l'écran, où seul `items` est lu.
    expect(itemsDepuisSeances(out)).toEqual([
      'Jour 1 : LC : Décodage des syllabes',
      'Jour 2 : Vocabulaire : les animaux de la ferme',
    ])
  })

  // ATTENTE MODIFIÉE le 21/08 : « Écriture » devient « Ecriture ». Des deux
  // écritures que la tolérance a déclarées équivalentes, c'est celle de l'ITEM
  // qui est gardée, y compris à longueur égale (voir `libelleRetenu`). L'ancienne
  // règle gardait la plus longue, la séance l'emportant à égalité : c'est elle
  // qui remplaçait « Le graphème où » par « Le graphème ou ».
  it('reconnaît la même puce à un accent ou à un point final près', () => {
    const seances = [
      { jour: 1, domaine: '', libelle: 'Découverte du son [a]' },
      { jour: 2, domaine: '', libelle: 'Écriture' },
    ]
    const out = completerSeances(seances, ['Découverte du son [a].', 'Ecriture'])
    expect(out).toHaveLength(2)
    expect(out.map(s => s.libelle)).toEqual(['Découverte du son [a].', 'Ecriture'])
  })

  // ATTENTE MODIFIÉE le 21/08, même raison : la casse vient de l'item. Les
  // espaces, eux, ne sont pas une différence à arbitrer, donc la forme déjà
  // propre survit à l'intérieur du texte.
  it('reconnaît la même puce à la casse et aux espaces près', () => {
    const seances = [{ jour: 1, domaine: '', libelle: 'Geste d’écriture' }]
    expect(completerSeances(seances, ['  GESTE D’ÉCRITURE '])).toEqual([
      { jour: 1, domaine: '', libelle: 'GESTE D’ÉCRITURE' },
    ])
  })
})

describe('frontière de tolérance : ce qui reste deux puces différentes', () => {
  it('ne fusionne pas deux puces qui diffèrent par un seul caractère de contenu', () => {
    const seances = [{ jour: 1, domaine: '', libelle: 'Le son [a]' }]
    expect(completerSeances(seances, ['Le son [o]'])).toHaveLength(2)
  })

  it('ne fusionne pas une puce et la même précisée', () => {
    const seances = [{ jour: 1, domaine: '', libelle: 'Fluence' }]
    expect(completerSeances(seances, ['Fluence : syllabes'])).toHaveLength(2)
    expect(completerSeances([{ jour: 1, domaine: '', libelle: 'Dictée' }], ['Dictée du lundi']))
      .toHaveLength(2)
  })

  it('ne fusionne pas deux intervalles qui ne diffèrent que par leurs jours', () => {
    const seances = [{ jour: null, domaine: 'Jours 3-4', libelle: 'Jours 3-4 : révisions' }]
    expect(completerSeances(seances, ['Jours 5-6 : révisions'])).toHaveLength(2)
  })

  it('ne fusionne pas deux domaines différents portant le même texte', () => {
    const seances = [{ jour: 1, domaine: 'LC', libelle: 'LC : la poule' }]
    expect(completerSeances(seances, ['Vocabulaire : la poule'])).toHaveLength(2)
  })

  // ATTENTE MODIFIÉE le 21/08, et c'est le PRIX ASSUMÉ des points 1 et 2 de la
  // relecture. La condition exigeait un `domaine` non vide du côté COURT : elle
  // protégeait ce cas-ci, mais elle laissait « LC : Décodage » et « Décodage »
  // ressortir en double dès que ce champ était vide, ce qui est le cas courant
  // puisqu'il est dérivé du texte. Les deux situations sont structurellement
  // indiscernables : dans les deux, le domaine de la puce longue vient de son
  // propre texte et ne prouve rien. On paie donc celle-ci, qui suppose qu'une
  // enseignante écrive dans la même semaine une puce réduite à la fin d'une
  // autre, plutôt que le doublon, qui frappait toutes les puces du document.
  it('avale une puce courte égale à la queue d’une puce plus longue', () => {
    const seances = [{ jour: 1, domaine: '', libelle: 'a' }]
    expect(completerSeances(seances, ['Geste d’écriture : a'])).toHaveLength(1)
  })

  // Ce qui protège vraiment, et qui n'a pas bougé : la QUEUE doit être égale.
  it('ne fusionne pas une puce et la même précisée, même à domaine vide', () => {
    expect(completerSeances(
      [{ jour: 1, domaine: '', libelle: 'Fluence' }],
      ['Fluence : syllabes'],
    )).toHaveLength(2)
    expect(completerSeances(
      [{ jour: null, domaine: 'Jours 3-4', libelle: 'Jours 3-4 : révisions' }],
      ['Jours 5-6 : révisions'],
    )).toHaveLength(2)
  })

  it('reconnaît en revanche la même puce à deux points, écrite deux fois pareil', () => {
    const seances = [{ jour: 1, domaine: 'Écriture', libelle: 'Geste d’écriture : a' }]
    expect(completerSeances(seances, ['Geste d’écriture : a'])).toEqual(seances)
  })
})

// À CORRIGER 5 : la sortie valait `[...seances, ...orphelines]`, donc la
// matinée de l'enseignante était réordonnée par le hasard de ce que le modèle
// avait rendu en séances. La tâche 5 posera la séance i dans le créneau i.
describe('ordre de sortie', () => {
  it('range chaque puce à son rang de lecture dans le document', () => {
    const seances = [{ jour: 4, domaine: '', libelle: 'Graphisme' }]
    const items = ['Fluence', 'Dictée', 'Copie', 'Graphisme']
    expect(itemsDepuisSeances(completerSeances(seances, items))).toEqual([
      'Fluence', 'Dictée', 'Copie', 'Jour 4 : Graphisme',
    ])
  })

  it('glisse une séance qu’aucun item ne reprend derrière la dernière séance placée', () => {
    const seances = [
      { jour: 1, domaine: '', libelle: 'Fluence' },
      { jour: 2, domaine: '', libelle: 'Rituel' },
    ]
    expect(itemsDepuisSeances(completerSeances(seances, ['Fluence', 'Copie']))).toEqual([
      'Jour 1 : Fluence', 'Jour 2 : Rituel', 'Copie',
    ])
  })
})

// À CORRIGER 6 : le jour écrit dans le document était écrasé sans un mot par
// celui que le modèle avait rendu. On garde celui du document : c'est le seul
// des deux qui se voit, puisque `items` est réécrit avec ce préfixe et que le
// cahier journal n'affiche que `items`.
describe('le jour écrit dans le document', () => {
  it('l’emporte sur le jour rendu par le modèle', () => {
    const seances = [{ jour: 1, domaine: '', libelle: 'Dictée' }]
    expect(completerSeances(seances, ['Jour 2 : Dictée'])).toEqual([
      { jour: 2, domaine: '', libelle: 'Dictée' },
    ])
  })

  it('date une séance que le modèle avait laissée sans jour', () => {
    const seances = [{ jour: null, domaine: '', libelle: 'Fluence' }]
    expect(completerSeances(seances, ['Jour 1 : Fluence'])).toEqual([
      { jour: 1, domaine: '', libelle: 'Fluence' },
    ])
  })

  it('n’échange pas les journées de deux puces identiques posées deux jours', () => {
    const seances = [
      { jour: 1, domaine: '', libelle: 'Geste d’écriture' },
      { jour: 3, domaine: '', libelle: 'Geste d’écriture' },
    ]
    const items = ['Jour 3 : Geste d’écriture', 'Jour 1 : Geste d’écriture']
    expect(completerSeances(seances, items)).toEqual([
      { jour: 3, domaine: '', libelle: 'Geste d’écriture' },
      { jour: 1, domaine: '', libelle: 'Geste d’écriture' },
    ])
  })

  it('laisse le texte trancher quand le préfixe et le champ jour se contredisent', () => {
    expect(itemsDepuisSeances([{ jour: 2, domaine: '', libelle: 'Jour 5 : Fluence' }]))
      .toEqual(['Jour 5 : Fluence'])
  })
})

// BLOQUANT 2 de la relecture du 21/08. `fusionner` gardait le libellé LE PLUS
// LONG, la séance l'emportant à égalité. Or un accent, une casse ou une
// apostrophe ne changent pas la longueur : le texte correct de l'enseignante
// était remplacé par la version fautive du modèle, et une puce du document
// disparaissait. « ou » et « où » sont deux graphèmes distincts au programme
// de CP.
describe('des deux écritures, laquelle est gardée', () => {
  it('garde le texte de l’item quand seule la forme diffère', () => {
    expect(completerSeances(
      [{ jour: 1, domaine: '', libelle: 'Le graphème ou' }],
      ['Le graphème où'],
    )).toEqual([{ jour: 1, domaine: '', libelle: 'Le graphème où' }])
  })

  it('ne remplace pas [é] par [e] au prétexte que les deux font la même longueur', () => {
    expect(completerSeances(
      [{ jour: 1, domaine: '', libelle: 'Le son [e]' }],
      ['Le son [é]'],
    )).toEqual([{ jour: 1, domaine: '', libelle: 'Le son [é]' }])
  })

  it('garde la casse écrite dans l’item', () => {
    expect(completerSeances(
      [{ jour: 1, domaine: '', libelle: 'DICTEE' }],
      ['Dictée'],
    )).toEqual([{ jour: 1, domaine: '', libelle: 'Dictée' }])
  })

  it('ne garde le texte le plus long que s’il contient l’autre', () => {
    // Là, la séance en dit vraiment plus : elle porte le domaine.
    expect(completerSeances(
      [{ jour: 1, domaine: 'LC', libelle: 'LC : Décodage' }],
      ['Décodage'],
    )).toEqual([{ jour: 1, domaine: 'LC', libelle: 'LC : Décodage' }])
  })

  it('ne compte pas l’espacement comme une différence à arbitrer', () => {
    // Deux écritures qui ne diffèrent que par leurs espaces disent exactement
    // la même chose : rien à choisir, on garde la forme déjà propre.
    expect(completerSeances(
      [{ jour: 1, domaine: 'LC', libelle: 'LC : la poule' }],
      ['  LC :  la poule  '],
    )).toEqual([{ jour: 1, domaine: 'LC', libelle: 'LC : la poule' }])
  })
})

// À CORRIGER 1 et 2 : la tolérance au domaine ne marchait que dans un sens
// (elle exigeait un `domaine` non vide du côté COURT), donc une puce écrite
// « LC : Décodage » d'un côté et « Décodage » de l'autre ressortait en double
// dès que le champ `domaine` du côté court était vide.
describe('tolérance au domaine, dans les deux sens', () => {
  it('reconnaît la puce quand c’est la séance qui porte le domaine devant', () => {
    expect(completerSeances(
      [{ jour: null, domaine: 'LC', libelle: 'LC : Décodage' }],
      ['Décodage'],
    )).toHaveLength(1)
  })

  it('reconnaît la puce quand aucun des deux côtés ne remplit le champ domaine', () => {
    expect(completerSeances(
      [{ jour: null, domaine: '', libelle: 'Décodage' }],
      ['LC : Décodage'],
    )).toHaveLength(1)
  })

  it('refuse encore deux domaines différents portant le même texte', () => {
    expect(completerSeances(
      [{ jour: 1, domaine: 'LC', libelle: 'Décodage' }],
      ['Vocabulaire : Décodage'],
    )).toHaveLength(2)
  })

  // DÉFAUT TROUVÉ EN EXÉCUTANT LA CHAÎNE le 21/08, sur une réponse mêlant les
  // deux formats. Le document écrit « Vocabulaire (séance 1) » SANS deux points.
  // Un modèle qui range ce domaine à part rend `libelle: '(séance 1)'` d'un côté
  // et l'item entier de l'autre : la comparaison ne reconnaissait pas la même
  // puce, et l'enseignante la voyait deux fois. Le séparateur entre le domaine
  // et le texte doit donc être optionnel.
  it('reconnaît la même puce quand le domaine est collé au texte, sans deux points', () => {
    const out = completerSeances(
      [{ jour: 3, domaine: 'Vocabulaire', libelle: '(séance 1)' }],
      ['Vocabulaire (séance 1)'],
    )
    expect(out).toHaveLength(1)
    // Et c'est le texte du document qui reste, pas le « : » que le code aurait
    // inventé en reposant le domaine.
    expect(out[0].libelle).toBe('Vocabulaire (séance 1)')
  })

  it('ne confond pas deux puces du même domaine collé', () => {
    expect(completerSeances(
      [{ jour: 3, domaine: 'Vocabulaire', libelle: '(séance 1)' }],
      ['Vocabulaire (séance 2)'],
    )).toHaveLength(2)
  })
})

// À CORRIGER 3 : le document de référence écrit « Geste d’écriture » avec
// l'apostrophe typographique U+2019 six fois, et le prompt mélange les deux
// formes. Chaque occurrence produisait un doublon.
describe('caractères typographiques équivalents', () => {
  it.each([
    ['apostrophe droite contre U+2019', "Geste d'écriture", 'Geste d’écriture'],
    ['ligature oe', 'Le son coeur', 'Le son cœur'],
    ['points de suspension U+2026', 'Le loup qui...', 'Le loup qui…'],
    ['guillemets français', '"la poule"', '« la poule »'],
    ['tiret demi-cadratin', 'Séances 1-2', 'Séances 1–2'],
  ])('reconnaît la même puce malgré %s', (_nom, cote, autre) => {
    expect(completerSeances([{ jour: 1, domaine: '', libelle: cote }], [autre])).toHaveLength(1)
  })

  it('garde bien le texte de l’item, pas celui du modèle', () => {
    expect(completerSeances(
      [{ jour: 1, domaine: '', libelle: "Geste d'écriture" }],
      ['Geste d’écriture'],
    )).toEqual([{ jour: 1, domaine: '', libelle: 'Geste d’écriture' }])
  })
})

// À CORRIGER 9 : formes d'intervalle non couvertes. Chacune faisait poser le
// jour rendu par le modèle et un préfixe devant le texte entier.
describe('autres formes d’intervalle de jours', () => {
  it.each([
    ['esperluette', 'Jours 3&4 : révisions'],
    ['barre oblique', 'Jours 3/4 : révisions'],
    ['« ou »', 'Jours 3 ou 4 : révisions'],
    ['« puis »', 'Jour 3 puis 4 : révisions'],
    ['« et » sans espaces', 'Jours 3et4 : révisions'],
    ['barre oblique espacée', 'Jour 3 / 4 : révisions'],
  ])('ne date pas et ne déforme pas la forme %s', (_nom, item) => {
    const [seance] = seancesDepuisItems([item])
    expect(seance.jour).toBeNull()
    expect(seance.libelle).toBe(item)
    expect(itemsDepuisSeances([{ ...seance, jour: 3 }])).toEqual([item])
  })

  it('ne prend toujours pas « Jour 3 : 4 opérations » pour un intervalle', () => {
    expect(seancesDepuisItems(['Jour 3 : 4 opérations'])).toEqual([
      { jour: 3, domaine: '', libelle: '4 opérations' },
    ])
  })
})

// BLOQUANT 1 : le domaine ne survivait pas jusqu'à `items`, donc pas jusqu'à
// l'écran, puisque le cahier journal ne lit que `items`.
describe('le domaine survit dans items', () => {
  it('écrit le domaine devant le texte quand le libellé ne le porte pas', () => {
    expect(itemsDepuisSeances([
      { jour: 4, domaine: 'LC', libelle: 'La petite poule (séance 4)' },
    ])).toEqual(['Jour 4 : LC : La petite poule (séance 4)'])
  })

  it('ne le double pas quand le libellé le porte déjà', () => {
    expect(itemsDepuisSeances([
      { jour: 4, domaine: 'LC', libelle: 'LC : La petite poule (séance 4)' },
    ])).toEqual(['Jour 4 : LC : La petite poule (séance 4)'])
  })

  it('ne le double pas non plus quand le document l’écrit sans deux points', () => {
    expect(itemsDepuisSeances([
      { jour: 1, domaine: 'Vocabulaire', libelle: 'Vocabulaire (séance 3)' },
    ])).toEqual(['Jour 1 : Vocabulaire (séance 3)'])
  })

  it('ne confond pas un domaine avec le début d’un mot', () => {
    expect(itemsDepuisSeances([
      { jour: null, domaine: 'Le', libelle: 'Lecture offerte' },
    ])).toEqual(['Le : Lecture offerte'])
  })

  it('refuse d’écrire un domaine trop long pour être relu comme tel', () => {
    // Au-delà de la borne du domaine, le texte réécrit ne se relirait plus
    // comme « domaine : contenu » et la puce ressortirait en double.
    const domaine = 'A'.repeat(31)
    expect(itemsDepuisSeances([{ jour: null, domaine, libelle: 'Fluence' }]))
      .toEqual(['Fluence'])
  })

  it('fait l’aller-retour sans rien perdre ni rien doubler', () => {
    const seances = [
      { jour: 4, domaine: 'LC', libelle: 'LC : La petite poule (séance 4)' },
      { jour: 1, domaine: 'Vocabulaire', libelle: 'Vocabulaire (séance 3)' },
    ]
    const items = itemsDepuisSeances(seances)
    expect(itemsDepuisSeances(completerSeances(seances, items))).toEqual(items)
  })
})

// À CORRIGER 8 : quand deux puces se ressemblent au sens tolérant et que le
// modèle les rend dans un ordre différent d'`items`, la sortie inversait leur
// ordre. La tâche 5 posant la séance i dans le créneau i, elles atterriraient
// au mauvais jour.
describe('ordre de sortie quand deux puces se ressemblent', () => {
  it('suit l’ordre du document, pas celui du modèle', () => {
    const seances = [
      { jour: null, domaine: '', libelle: 'Le son [ou]' },
      { jour: null, domaine: '', libelle: 'Le son [où]' },
    ]
    const items = ['Le son [où]', 'Le son [ou]']
    expect(itemsDepuisSeances(completerSeances(seances, items))).toEqual(items)
  })
})

// À CORRIGER 5 : un intervalle dans `items` et un jour rendu par le modèle à
// côté faisaient ressortir la puce EN DOUBLE, l'une datée, l'autre intacte.
describe('intervalle dans items et jour rendu par le modèle', () => {
  it('ne fabrique pas une puce de plus', () => {
    const seances = [
      { jour: 3, domaine: '', libelle: 'révisions' },
      { jour: 1, domaine: '', libelle: 'Fluence' },
    ]
    const items = ['Jours 3-4 : révisions', 'Jour 1 : Fluence']
    expect(itemsDepuisSeances(completerSeances(seances, items))).toEqual(items)
  })
})
