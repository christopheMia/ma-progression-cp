import { seancesDepuisItems, itemsDepuisSeances } from '../progression-seances'

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

  // La colonne JSONB peut contenir un nombre ou un null isolé : converti en
  // texte plutôt que supprimé, pour ne jamais perdre silencieusement du
  // contenu (même une valeur inattendue reste visible pour l'enseignante).
  it('convertit un élément non-string de la colonne JSONB en texte au lieu de le supprimer', () => {
    expect(seancesDepuisItems([42, null] as unknown[])).toEqual([
      { jour: null, domaine: '', libelle: '42' },
      { jour: null, domaine: '', libelle: 'null' },
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
