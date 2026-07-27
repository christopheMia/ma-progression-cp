import {
  ABREVIATION_NIVEAU,
  LIBELLE_NIVEAU,
  NIVEAUX,
  estAcquis,
  estNiveau,
  niveauDepuisAcquis,
} from '@/lib/niveaux'

describe('l’échelle des quatre niveaux', () => {
  it('va du moins au plus, dans l’ordre du livret', () => {
    expect(NIVEAUX).toEqual(['non_atteint', 'partiellement', 'atteint', 'depasse'])
  })

  it('donne une abréviation courte pour chaque niveau', () => {
    expect(NIVEAUX.map(n => ABREVIATION_NIVEAU[n])).toEqual(['NA', 'PA', 'A', 'D'])
  })

  it('donne un libellé complet pour chaque niveau', () => {
    expect(LIBELLE_NIVEAU.non_atteint).toBe('non atteint')
    expect(LIBELLE_NIVEAU.partiellement).toBe('partiellement atteint')
    expect(LIBELLE_NIVEAU.atteint).toBe('atteint')
    expect(LIBELLE_NIVEAU.depasse).toBe('dépassé')
  })

  // C'est la regle du trigger SQL de la migration 019. Les deux doivent dire la
  // meme chose, sinon l'ecran et la base ne compteraient pas pareil.
  it('compte comme acquis ce qui est atteint ou dépassé, et rien d’autre', () => {
    expect(estAcquis('atteint')).toBe(true)
    expect(estAcquis('depasse')).toBe(true)
    expect(estAcquis('partiellement')).toBe(false)
    expect(estAcquis('non_atteint')).toBe(false)
  })

  it('relit l’ancien booléen sans rien perdre', () => {
    expect(niveauDepuisAcquis(true)).toBe('atteint')
    expect(niveauDepuisAcquis(false)).toBe('non_atteint')
    expect(niveauDepuisAcquis(null)).toBeNull()
  })

  // La base peut rendre autre chose (ligne ancienne, valeur inattendue) : on ne
  // veut pas d'un bouton allume au hasard.
  it('refuse une valeur qui n’est pas un niveau', () => {
    expect(estNiveau('atteint')).toBe(true)
    expect(estNiveau('acquis')).toBe(false)
    expect(estNiveau('')).toBe(false)
    expect(estNiveau(null)).toBe(false)
    expect(estNiveau(true)).toBe(false)
  })
})
