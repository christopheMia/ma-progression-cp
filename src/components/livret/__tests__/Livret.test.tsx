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
      competences={competences}
      travaillees={[{ periode: 1, competenceId: 'k1' }, { periode: 1, competenceId: 'k2' }]}
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

  // Virage du 28/07 : plus rien n'est calcule. Les competences viennent de ce
  // qui a ete coche dans « Programme couvert », et l'enseignante positionne.
  test('affiche les compétences cochées, sans niveau tant que rien n’est posé', () => {
    afficher()
    expect(screen.getByText('Identifier des mots')).toBeTruthy()
    expect(screen.getByText('Nommer les nombres')).toBeTruthy()
    expect(screen.getByRole('radio', {
      name: /lina, identifier des mots : atteint/i,
    }).getAttribute('aria-checked')).toBe('false')
  })

  test('reprend le niveau déjà posé pour cet élève', () => {
    afficher({ positions: [{ eleveId: 'e1', periode: 1, competenceId: 'k1', niveau: 'atteint' }] })
    expect(screen.getByRole('radio', {
      name: /lina, identifier des mots : atteint/i,
    }).getAttribute('aria-checked')).toBe('true')
  })

  test('n’affiche pas une compétence cochée sur une autre période', async () => {
    const user = userEvent.setup()
    afficher({ travaillees: [{ periode: 2, competenceId: 'k1' }] })
    expect(screen.queryByText('Identifier des mots')).toBeNull()

    await user.selectOptions(screen.getByLabelText(/période/i), '2')
    expect(screen.getByText('Identifier des mots')).toBeTruthy()
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
    afficher({ positions: [{ eleveId: 'e1', periode: 1, competenceId: 'k1', niveau: 'atteint' }] })

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
    const barre = screen.getByLabelText(/tout le bilan/i).closest('div')!

    expect(within(barre).getByRole('button', { name: /copier les 2 blocs cochés/i })).toBeTruthy()

    await user.click(screen.getByLabelText(/inclure mathématiques dans la copie groupée/i))
    expect(within(barre).getByRole('button', { name: /^copier français$/i })).toBeTruthy()

    await user.click(screen.getByLabelText(/inclure français dans la copie groupée/i))
    expect(within(barre).getByRole('button', { name: /rien à copier/i })).toBeTruthy()
  })

  // Regle 3 : sans phrase ecrite par l'enseignante, on n'invente pas. L'ecran
  // le lui demande au lieu de recopier le libelle officiel.
  test('demande ses mots quand une compétence n’a pas de formulation', async () => {
    const user = userEvent.setup()
    afficher({
      formulations: {},
      positions: [
        { eleveId: 'e1', periode: 1, competenceId: 'k1', niveau: 'atteint' },
        { eleveId: 'e1', periode: 1, competenceId: 'k2', niveau: 'atteint' },
      ],
    })

    // Une par matière : les deux compétences positionnées attendent leur phrase.
    expect(screen.getAllByText(/une compétence attend tes mots/i)).toHaveLength(2)

    const champ = screen.getByLabelText(/comment dire « identifier des mots » quand c’est atteint/i)
    await user.type(champ, 'lit très bien maintenant')
    await user.click(screen.getAllByRole('button', { name: /garder cette phrase/i })[0])

    await waitFor(() => expect(enregistrerFormulation).toHaveBeenCalledWith('k1', expect.objectContaining({
      reussite: 'lit très bien maintenant',
    })))
  })

  // Une phrase gardee l'an dernier peut etre mauvaise cette annee : elle ne
  // disparait pas une fois enregistree.
  test('laisse corriger une phrase déjà écrite', async () => {
    const user = userEvent.setup()
    afficher({ positions: [{ eleveId: 'e1', periode: 1, competenceId: 'k1', niveau: 'atteint' }] })

    const repli = screen.getByText(/corriger mes phrases déjà écrites \(1\)/i)
    expect(repli).toBeTruthy()

    const champ = screen.getByLabelText(/comment dire « identifier des mots » quand c’est atteint/i)
    expect((champ as HTMLInputElement).value).toBe('lit avec assurance les mots étudiés')

    await user.clear(champ)
    await user.type(champ, 'lit tout seul maintenant')
    await user.click(screen.getByRole('button', { name: /garder cette phrase/i }))

    await waitFor(() => expect(enregistrerFormulation).toHaveBeenCalledWith('k1', expect.objectContaining({
      reussite: 'lit tout seul maintenant',
    })))
  })

  // Regle 2 : une difficulte ne s'enonce jamais seule.
  test('refuse une difficulté sans sa prochaine étape', async () => {
    const user = userEvent.setup()
    afficher({
      formulations: {},
      positions: [{ eleveId: 'e1', periode: 1, competenceId: 'k1', niveau: 'non_atteint' }],
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

  // Demande de Christophe du 28/07 : le bilan general se compose dans le suivi
  // de l'eleve. Le livret le relit, le copie, et le laisse modifiable.
  test('relit l’appréciation générale écrite dans le suivi', () => {
    afficher({
      appreciations: [{
        eleveId: 'e1', periode: 1, matiere: '__general',
        texte: 'Lina a globalement bien travaillé.', ecartees: [], retouchees: {},
      }],
      semaineParPeriode: { 1: 's7' },
    })

    expect((screen.getByLabelText(/appréciation générale de lina/i) as HTMLTextAreaElement).value)
      .toBe('Lina a globalement bien travaillé.')
    expect(screen.getByRole('button', { name: /copier l’appréciation générale/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /le reprendre dans le suivi/i })
      .getAttribute('href')).toBe('/semaine/s7')
  })

  test('l’appréciation générale reste modifiable depuis le livret', async () => {
    const user = userEvent.setup()
    afficher()

    await user.type(screen.getByLabelText(/appréciation générale de lina/i), 'Belle période.')
    // L'enregistrement part APRES la frappe (600 ms), pas a chaque lettre.
    await waitFor(() => expect(enregistrerAppreciationPeriode).toHaveBeenCalledWith(
      'e1', 1, '__general', expect.stringContaining('Belle période.'), [], {},
    ), { timeout: 3000 })
    expect((enregistrerAppreciationPeriode as jest.Mock).mock.calls).toHaveLength(1)
  })

  test('la copie groupée compte l’appréciation générale', () => {
    afficher({
      appreciations: [{
        eleveId: 'e1', periode: 1, matiere: '__general',
        texte: 'Lina a globalement bien travaillé.', ecartees: [], retouchees: {},
      }],
    })
    const barre = screen.getByLabelText(/tout le bilan/i).closest('div')!
    expect(within(barre).getByRole('button', { name: /copier les 3 blocs cochés/i })).toBeTruthy()
  })

  test('dit où écrire l’appréciation générale quand elle est vide', () => {
    afficher({ semaineParPeriode: { 1: 's7' } })
    expect(screen.getByPlaceholderText(/s’écrit dans son suivi/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /aller l’écrire dans le suivi/i })).toBeTruthy()
  })

  // Regle d'or de Christophe : on ne bloque jamais. Un niveau clique par erreur
  // doit pouvoir redevenir « pas encore positionne ».
  test('recliquer le niveau posé l’efface', async () => {
    const user = userEvent.setup()
    afficher({ positions: [{ eleveId: 'e1', periode: 1, competenceId: 'k1', niveau: 'atteint' }] })

    await user.click(screen.getByRole('radio', { name: /lina, identifier des mots : atteint/i }))
    await waitFor(() => expect(definirPositionnement).toHaveBeenCalledWith('e1', 1, 'k1', null))
    expect(screen.getByRole('radio', {
      name: /lina, identifier des mots : atteint/i,
    }).getAttribute('aria-checked')).toBe('false')
  })

  // Un bilan general seul suffit a dire que l'eleve est commence.
  test('compte l’élève comme commencé sur sa seule appréciation générale', () => {
    afficher({
      appreciations: [{
        eleveId: 'e2', periode: 1, matiere: '__general',
        texte: 'Tom a traversé une période difficile.', ecartees: [], retouchees: {},
      }],
    })
    expect(screen.getByText(/1 bilan commencé sur 2/i)).toBeTruthy()
  })

  test('le dit quand aucune compétence n’est cochée sur la période', async () => {
    const user = userEvent.setup()
    afficher()

    await user.selectOptions(screen.getByLabelText(/période/i), '2')
    expect(screen.getByText(/aucune compétence cochée pour cette période/i)).toBeTruthy()
  })
})
