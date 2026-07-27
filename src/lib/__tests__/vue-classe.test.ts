import { agregerClasse, type EntreeSuivi } from '@/lib/vue-classe'

const eleves = [
  { id: 'e1', prenom: 'Lina' },
  { id: 'e2', prenom: 'Tom' },
]

const criteres = [
  { id: 'c1', matiere: 'francais', notion: 'Lire a', libelle: 'Repère le son', ordre: 0 },
  { id: 'c2', matiere: 'francais', notion: 'Lire a', libelle: 'Écrit la lettre', ordre: 1 },
]

function entree(p: Partial<EntreeSuivi> = {}): EntreeSuivi {
  return {
    eleves,
    notions: [{ matiere: 'francais', notion: 'Lire a' }],
    criteres,
    valeurCritere: () => null,
    valeurNotion: () => null,
    ...p,
  }
}

describe('agregerClasse', () => {
  it('rend une ligne par élève et une case par notion', () => {
    const lignes = agregerClasse(entree())
    expect(lignes.map(l => l.prenom)).toEqual(['Lina', 'Tom'])
    expect(lignes[0].cases).toHaveLength(1)
    expect(lignes[0].cases[0].notion).toBe('Lire a')
  })

  it('compte les critères atteints sur le total des critères', () => {
    const lignes = agregerClasse(entree({
      valeurCritere: (eleveId, critereId) =>
        eleveId === 'e1' && critereId === 'c1'
          ? 'atteint'
          : critereId === 'c2'
            ? 'non_atteint'
            : null,
    }))
    const lina = lignes[0].cases[0]
    expect(lina.acquis).toBe(1)
    expect(lina.total).toBe(2)
    expect(lina.statut).toBe('partiel')
  })

  it('marque complet quand tous les critères sont atteints', () => {
    const lignes = agregerClasse(entree({ valeurCritere: () => 'atteint' }))
    expect(lignes[0].cases[0].statut).toBe('complet')
    expect(lignes[0].cases[0].acquis).toBe(2)
  })

  // « Depasse » vaut acquis, exactement comme le trigger de la migration 019.
  it('compte « dépassé » comme acquis', () => {
    const lignes = agregerClasse(entree({ valeurCritere: () => 'depasse' }))
    expect(lignes[0].cases[0]).toMatchObject({ acquis: 2, statut: 'complet' })
  })

  it('marque aucun quand tout est explicitement non atteint', () => {
    const lignes = agregerClasse(entree({ valeurCritere: () => 'non_atteint' }))
    expect(lignes[0].cases[0].statut).toBe('aucun')
    expect(lignes[0].cases[0].acquis).toBe(0)
  })

  // Le vrai apport des quatre niveaux : un enfant en chemin ne se lit plus
  // comme un enfant en echec. En binaire, ces deux cas rendaient « aucun ».
  it('marque en cours quand tout est partiellement atteint', () => {
    const lignes = agregerClasse(entree({ valeurCritere: () => 'partiellement' }))
    const lina = lignes[0].cases[0]
    expect(lina.statut).toBe('partiel')
    expect(lina.acquis).toBe(0)
    expect(lina.enCours).toBe(2)
  })

  it('compte à part les critères partiellement atteints', () => {
    const lignes = agregerClasse(entree({
      valeurCritere: (_eleveId, critereId) =>
        critereId === 'c1' ? 'atteint' : 'partiellement',
    }))
    expect(lignes[0].cases[0]).toMatchObject({ acquis: 1, enCours: 1, total: 2 })
  })

  it('marque vide tant que rien n’est renseigné', () => {
    const lignes = agregerClasse(entree())
    expect(lignes[0].cases[0].statut).toBe('vide')
  })

  // Sans critère personnalise, la notion vaut pour elle-meme : l'enseignant qui
  // n'a pas cree de critere doit quand meme voir sa classe avancer.
  it('retombe sur le suivi global de la notion quand il n’y a aucun critère', () => {
    const sansCriteres = entree({
      criteres: [],
      valeurNotion: eleveId => (eleveId === 'e1' ? 'atteint' : null),
    })
    const lignes = agregerClasse(sansCriteres)
    expect(lignes[0].cases[0]).toMatchObject({ acquis: 1, total: 1, statut: 'complet' })
    expect(lignes[1].cases[0]).toMatchObject({ acquis: 0, total: 1, statut: 'vide' })
  })

  it('lit aussi le niveau intermédiaire du suivi global', () => {
    const lignes = agregerClasse(entree({
      criteres: [],
      valeurNotion: () => 'partiellement',
    }))
    expect(lignes[0].cases[0]).toMatchObject({ acquis: 0, enCours: 1, statut: 'partiel' })
  })

  it('donne le total de la classe par notion', () => {
    const lignes = agregerClasse(entree({
      valeurCritere: eleveId => (eleveId === 'e1' ? 'atteint' : 'non_atteint'),
    }))
    expect(lignes[0].cases[0].statut).toBe('complet')
    expect(lignes[1].cases[0].statut).toBe('aucun')
  })

  it('n’invente pas de case quand il n’y a aucune notion', () => {
    const lignes = agregerClasse(entree({ notions: [] }))
    expect(lignes[0].cases).toEqual([])
  })

  it('garde l’ordre des notions donné en entrée', () => {
    const lignes = agregerClasse(entree({
      notions: [
        { matiere: 'maths', notion: 'Nombres' },
        { matiere: 'francais', notion: 'Lire a' },
      ],
    }))
    expect(lignes[0].cases.map(c => c.notion)).toEqual(['Nombres', 'Lire a'])
  })
})
