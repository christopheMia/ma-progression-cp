import {
  estEtatComportement,
  posturePour,
  resumerComportement,
  type EtatComportement,
} from '@/lib/comportement'

const b: EtatComportement = 'bien'
const a: EtatComportement = 'attention'
const d: EtatComportement = 'difficile'

describe('resumerComportement', () => {
  it('compte chaque état', () => {
    expect(resumerComportement([b, b, a, d, b])).toMatchObject({
      bien: 3, attention: 1, difficile: 1, vides: 0,
    })
  })

  // Une periode a moitie remplie ne se raconte pas comme une periode
  // difficile : les trous se comptent a part.
  it('compte à part les semaines sans rien de noté', () => {
    expect(resumerComportement([b, null, null])).toMatchObject({ bien: 1, vides: 2 })
  })

  it('rend une phrase lisible', () => {
    expect(resumerComportement([b, b, a]).phrase)
      .toBe('2 semaines qui se sont bien passées, 1 à surveiller')
  })

  it('accorde le singulier', () => {
    expect(resumerComportement([b, d]).phrase)
      .toBe('1 semaine qui s’est bien passée, 1 difficile')
  })

  it('ne dit rien quand rien n’est noté', () => {
    expect(resumerComportement([null, null]).phrase).toBe('')
    expect(resumerComportement([]).phrase).toBe('')
  })
})

describe('posturePour', () => {
  // Regle 3 : on n'invente jamais une observation que l'enseignante n'a pas
  // faite. Sans rien de note, il n'y a pas de posture a decrire.
  it('ne propose rien quand rien n’est noté', () => {
    expect(posturePour(resumerComportement([null, null]))).toBe('')
  })

  it('décrit une période entièrement sereine', () => {
    expect(posturePour(resumerComportement([b, b, b])))
      .toBe('a gardé le même sérieux tout au long de la période')
  })

  it('nuance quand quelques semaines ont été fragiles', () => {
    expect(posturePour(resumerComportement([b, b, b, a])))
      .toContain('globalement bien travaillé')
  })

  it('dit la période difficile sans détour', () => {
    expect(posturePour(resumerComportement([d, d, d, b])))
      .toBe('a traversé une période difficile')
  })

  it('parle d’irrégularité quand rien ne domine', () => {
    expect(posturePour(resumerComportement([b, a, a])))
      .toBe('a connu une période irrégulière')
  })

  // Ces phrases se completent apres « Elle » ou « Il » : un adjectif accorde
  // obligerait a connaitre le genre ici, et serait faux une fois sur deux.
  it('n’emploie aucun adjectif accordé', () => {
    const phrases = [
      posturePour(resumerComportement([b, b])),
      posturePour(resumerComportement([b, b, b, a])),
      posturePour(resumerComportement([d, d, b])),
      posturePour(resumerComportement([b, a, a])),
    ]
    for (const phrase of phrases) {
      expect(phrase).not.toMatch(/sereine?|contente?|attentive|présente?/i)
    }
  })
})

describe('estEtatComportement', () => {
  it('reconnaît les trois états et rien d’autre', () => {
    expect(estEtatComportement('bien')).toBe(true)
    expect(estEtatComportement('difficile')).toBe(true)
    expect(estEtatComportement('moyen')).toBe(false)
    expect(estEtatComportement(null)).toBe(false)
  })
})
