import { lireReponseRegle, REGLE_JSON_SCHEMA } from '../schema-regle'
import { SYSTEM_REGLE, userRegle } from '../prompts'

const CASES = [
  { nom: 'APC', jours: ['mardi' as const] },
  { nom: 'Musique', jours: ['jeudi' as const] },
]
const brut = (o: Record<string, string>) => ({ statut: 'regle', type: '', creneau: '', jour: '', plus_proche: '', ...o })

describe('lireReponseRegle', () => {
  it('une règle sur une case qui existe, à l’écriture de l’emploi du temps', () => {
    expect(lireReponseRegle(brut({ type: 'Chant', creneau: 'musique', jour: 'jeudi' }), CASES)).toEqual({
      statut: 'regle', regle: { type: 'Chant', creneau: 'Musique', jour: 'jeudi' },
    })
  })
  it('le type connu l’emporte sur celui que l’IA a lu', () => {
    expect(lireReponseRegle(brut({ type: 'chants', creneau: 'Musique' }), CASES, 'Chant')).toEqual({
      statut: 'regle', regle: { type: 'Chant', creneau: 'Musique', jour: null },
    })
  })
  it('une case inventée par l’IA n’est jamais rendue comme règle', () => {
    expect(lireReponseRegle(brut({ type: 'Fluence', creneau: 'Ateliers', plus_proche: 'Atelier X' }), CASES)).toEqual({
      statut: 'introuvable', type: 'Fluence', demande: 'Ateliers', plusProche: null,
    })
  })
  it('case introuvable avec une case proche qui existe', () => {
    expect(lireReponseRegle(brut({ statut: 'introuvable', type: 'Fluence', creneau: 'Soutien', jour: 'mardi', plus_proche: 'APC' }), CASES))
      .toEqual({ statut: 'introuvable', type: 'Fluence', demande: 'Soutien le mardi', plusProche: { creneau: 'APC', jour: 'mardi' } })
  })
  it('la case existe, mais pas ce jour-là : introuvable, la case sans jour en proposition', () => {
    expect(lireReponseRegle(brut({ type: 'Fluence', creneau: 'APC', jour: 'vendredi' }), CASES)).toEqual({
      statut: 'introuvable', type: 'Fluence', demande: 'APC le vendredi', plusProche: { creneau: 'APC', jour: null },
    })
  })
  it('incompris : réponse vide, mal formée, ou sans type', () => {
    expect(lireReponseRegle(null, CASES)).toEqual({ statut: 'incompris' })
    expect(lireReponseRegle(brut({ statut: 'incompris' }), CASES)).toEqual({ statut: 'incompris' })
    expect(lireReponseRegle(brut({ creneau: 'Musique' }), CASES)).toEqual({ statut: 'incompris' })
  })
})

describe('le schéma et les consignes', () => {
  it('le schéma impose les cinq champs', () => {
    expect(REGLE_JSON_SCHEMA.required).toEqual(['statut', 'type', 'creneau', 'jour', 'plus_proche'])
  })
  it('les consignes donnent la phrase, le type connu et les cases par jour', () => {
    const texte = userRegle({ phrase: 'le chant c’est le jeudi en musique', type: 'Chant', cases: CASES })
    expect(texte).toContain('le chant c’est le jeudi en musique')
    expect(texte).toContain('Type concerné : Chant')
    expect(texte).toContain('jeudi : Musique')
    expect(texte).toContain('mardi : APC')
    expect(SYSTEM_REGLE).toContain('introuvable')
  })
})
