/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Livret from '../Livret'
import {
  definirPositionnement,
  enregistrerAppreciationPeriode,
  enregistrerFormulation,
} from '@/lib/actions/livret'

jest.mock('@/lib/actions/livret', () => ({
  definirPositionnement: jest.fn(),
  enregistrerAppreciationPeriode: jest.fn(),
  enregistrerFormulation: jest.fn(),
}))

const eleves = [
  { id: 'e1', prenom: 'Lina', genre: 'f' as const },
  { id: 'e2', prenom: 'Tom', genre: 'm' as const },
]

const competences = [
  { id: 'k1', matiere: 'francais', domaine: 'Lecture', libelle: 'Identifier des mots' },
  { id: 'k2', matiere: 'maths', domaine: 'Nombres', libelle: 'Nommer les nombres' },
]

const rattachements = [
  { matiere: 'francais', semaine: 8, notion: 'Lire a', competenceId: 'k1' },
  { matiere: 'maths', semaine: 8, notion: 'Les nombres', competenceId: 'k2' },
]

const formulations = {
  k1: {
    eclat: '', reussite: 'lit avec assurance les mots étudiés',
    encours: 'déchiffre de mieux en mieux', vigilance: 'le déchiffrage demande de l’aide',
    suite: 'nous le travaillerons en petit groupe',
  },
  k2: {
    eclat: '', reussite: 'nomme les nombres jusqu’à 100',
    encours: 'nomme les nombres jusqu’à 60', vigilance: 'les nombres ne sont pas installés',
    suite: 'nous les reverrons avec du matériel',
  },
}

function afficher(surcharges: Record<string, unknown> = {}) {
  render(
    <Livret
      eleves={eleves}
      periodes={[1, 2]}
      semainesParPeriode={{ 1: [8, 9], 2: [15] }}
      competences={competences}
      rattachements={rattachements}
      observations={{
        e1: [
          { semaine: 8, matiere: 'francais', notion: 'Lire a', niveau: 'atteint' },
          { semaine: 8, matiere: 'maths', notion: 'Les nombres', niveau: 'partiellement' },
        ],
      }}
      motsDeLaSemaine={{}}
      formulations={formulations}
      positions={[]}
      appreciations={[]}
      {...surcharges}
    />,
  )
}

describe('Livret', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(definirPositionnement as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
    ;(enregistrerAppreciationPeriode as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
    ;(enregistrerFormulation as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
  })

  test('propose un niveau tiré du suivi, et dit d’où il sort', async () => {
    afficher()
    expect(screen.getByRole('radio', {
      name: /lina, identifier des mots : atteint/i,
    }).getAttribute('aria-checked')).toBe('true')
    // Maths est proposé partiellement atteint, sur la même observation unique.
    expect(screen.getByRole('radio', {
      name: /lina, nommer les nombres : partiellement atteint/i,
    }).getAttribute('aria-checked')).toBe('true')
    // Chaque ligne dit d'ou sort son niveau : rien n'est calcule en cachette.
    expect(screen.getAllByText(/1 observation, la dernière en semaine 8/i)).toHaveLength(2)
  })

  test('enregistre le positionnement corrigé à la main', async () => {
    const user = userEvent.setup()
    afficher()

    await user.click(screen.getByRole('radio', {
      name: /lina, identifier des mots : dépassé/i,
    }))

    await waitFor(() => expect(definirPositionnement).toHaveBeenCalledWith('e1', 1, 'k1', 'depasse'))
  })

  // Le livret officiel demande un commentaire PAR MATIERE.
  test('donne un bloc et un bouton de copie par matière', () => {
    afficher()
    expect(screen.getByRole('heading', { name: /français : acquisitions/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /mathématiques : acquisitions/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^copier français$/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^copier mathématiques$/i })).toBeTruthy()
  })

  test('rédige le commentaire d’une matière à partir des briques', async () => {
    const user = userEvent.setup()
    afficher()

    const bloc = screen.getByRole('heading', { name: /français : acquisitions/i }).closest('section')!
    await user.click(within(bloc).getByRole('button', { name: /rédiger/i }))

    await waitFor(() => expect(enregistrerAppreciationPeriode).toHaveBeenCalledWith(
      'e1', 1, 'francais', 'Lina lit avec assurance les mots étudiés.', [], {},
    ))
  })

  test('le bouton de copie groupée dit ce qu’il va copier', async () => {
    const user = userEvent.setup()
    afficher()
    // La barre du bas, distincte des boutons « Copier <matière> » des blocs.
    const barre = screen.getByLabelText(/toutes les matières/i).closest('div')!

    expect(within(barre).getByRole('button', { name: /copier les 2 matières cochées/i })).toBeTruthy()

    await user.click(screen.getByLabelText(/inclure mathématiques dans la copie groupée/i))
    expect(within(barre).getByRole('button', { name: /^copier français$/i })).toBeTruthy()

    await user.click(screen.getByLabelText(/inclure français dans la copie groupée/i))
    expect(within(barre).getByRole('button', { name: /rien à copier/i })).toBeTruthy()
  })

  // Regle 3 : sans phrase ecrite par l'enseignante, on n'invente pas. L'ecran
  // le lui demande au lieu de recopier le libelle officiel.
  test('demande ses mots quand une compétence n’a pas de formulation', async () => {
    const user = userEvent.setup()
    afficher({ formulations: {} })

    // Une par matière : les deux compétences positionnées attendent leur phrase.
    expect(screen.getAllByText(/une compétence attend tes mots/i)).toHaveLength(2)

    const champ = screen.getByLabelText(/comment dire « identifier des mots » quand c’est atteint/i)
    await user.type(champ, 'lit très bien maintenant')
    await user.click(screen.getAllByRole('button', { name: /garder cette phrase/i })[0])

    await waitFor(() => expect(enregistrerFormulation).toHaveBeenCalledWith('k1', expect.objectContaining({
      reussite: 'lit très bien maintenant',
    })))
  })

  // Regle 2 : une difficulte ne s'enonce jamais seule.
  test('refuse une difficulté sans sa prochaine étape', async () => {
    const user = userEvent.setup()
    afficher({
      formulations: {},
      observations: {
        e1: [{ semaine: 8, matiere: 'francais', notion: 'Lire a', niveau: 'non_atteint' }],
      },
    })

    const champ = screen.getByLabelText(/comment dire « identifier des mots » quand c’est non atteint/i)
    await user.type(champ, 'le déchiffrage reste difficile')

    const bouton = screen.getAllByRole('button', { name: /garder cette phrase/i })[0]
    expect((bouton as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/une difficulté ne s’écrit jamais seule/i)).toBeTruthy()

    await user.type(screen.getAllByLabelText(/prochaine étape/i)[0], 'nous le reverrons en petit groupe')
    expect((screen.getAllByRole('button', { name: /garder cette phrase/i })[0] as HTMLButtonElement).disabled)
      .toBe(false)
  })

  test('change d’élève avec les flèches et suit le compteur', async () => {
    const user = userEvent.setup()
    afficher({
      appreciations: [{
        eleveId: 'e1', periode: 1, matiere: 'francais',
        texte: 'Déjà écrit.', ecartees: [], retouchees: {},
      }],
    })

    expect(screen.getByText(/1 bilan commencé sur 2/i)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /tom →/i }))
    expect(screen.getByRole('heading', { name: /où en est tom/i })).toBeTruthy()
  })

  test('le dit quand rien n’est rattaché au programme sur la période', async () => {
    const user = userEvent.setup()
    afficher()

    await user.selectOptions(screen.getByLabelText(/période/i), '2')
    expect(screen.getByText(/rien n’est encore rattaché au programme/i)).toBeTruthy()
  })
})
