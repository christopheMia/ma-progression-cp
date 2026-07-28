/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuiviEleves from '../SuiviEleves'
import {
  ajouterObservation,
  definirComportement,
  modifierObservation,
  supprimerObservation,
} from '@/lib/actions/suivi-libre'

jest.mock('@/lib/actions/suivi-libre', () => ({
  ajouterObservation: jest.fn(),
  definirComportement: jest.fn(),
  modifierObservation: jest.fn(),
  supprimerObservation: jest.fn(),
}))

const eleves = [
  { id: 'e1', prenom: 'Lina' },
  { id: 'e2', prenom: 'Tom' },
]

const semainesPeriode = [
  { id: 's9', numero: 9 },
  { id: 's10', numero: 10 },
  { id: 's11', numero: 11 },
]

function afficher(surcharges: Record<string, unknown> = {}) {
  render(
    <SuiviEleves
      semaineId="s10"
      numeroSemaine={10}
      dateParDefaut="2026-11-24"
      eleves={eleves}
      semainesPeriode={semainesPeriode}
      comportements={{ 'e1|s9': 'bien', 'e1|s10': 'attention' }}
      observations={[{
        id: 'o1', eleveId: 'e1', semaineId: 's10',
        observeeLe: '2026-11-25', texte: 'A osé lire devant le groupe.',
      }]}
      {...surcharges}
    />,
  )
}

describe('SuiviEleves', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(definirComportement as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
    ;(ajouterObservation as jest.Mock).mockResolvedValue({ ok: true, valeur: 'o2' })
    ;(modifierObservation as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
    ;(supprimerObservation as jest.Mock).mockResolvedValue({ ok: true, valeur: undefined })
  })

  test('reprend le comportement déjà noté pour la semaine', () => {
    afficher()
    expect(screen.getByRole('radio', {
      name: /lina, semaine 10 : à surveiller/i,
    }).getAttribute('aria-checked')).toBe('true')
  })

  test('enregistre le comportement choisi', async () => {
    const user = userEvent.setup()
    afficher()

    await user.click(screen.getByRole('radio', { name: /lina, semaine 10 : ça va bien/i }))
    await waitFor(() => expect(definirComportement).toHaveBeenCalledWith('e1', 's10', 'bien'))
  })

  // « Rien de note » doit rester atteignable : on se trompe de bouton, et une
  // semaine sans avis n'est pas une semaine difficile.
  test('recliquer le même état l’enlève', async () => {
    const user = userEvent.setup()
    afficher()

    await user.click(screen.getByRole('radio', { name: /lina, semaine 10 : à surveiller/i }))
    await waitFor(() => expect(definirComportement).toHaveBeenCalledWith('e1', 's10', null))
  })

  test('résume la période sans compter les semaines vides', () => {
    afficher()
    // Une semaine « bien », une « à surveiller », une sans rien.
    expect(screen.getByText(/1 semaine qui s’est bien passée, 1 à surveiller/i)).toBeTruthy()
  })

  // Une semaine « bien » et une « à surveiller » : le bien ne domine pas, mais
  // il ne s'efface pas non plus.
  test('propose une posture pour le bilan, tirée de la frise', () => {
    afficher()
    const resume = screen.getByText(/1 semaine qui s’est bien passée/i)
    expect(resume.textContent)
      .toMatch(/Lina a globalement bien travaillé, avec quelques semaines plus fragiles/i)
  })

  test('ne propose aucune posture quand rien n’est noté', () => {
    afficher({ comportements: {} })
    expect(screen.queryByText(/proposé pour le bilan/i)).toBeNull()
  })

  test('ajoute une observation à la date choisie', async () => {
    const user = userEvent.setup()
    afficher()

    await user.click(screen.getByRole('button', { name: /ajouter une observation/i }))
    await waitFor(() => expect(ajouterObservation).toHaveBeenCalledWith('e1', 's10', '2026-11-24'))
    expect(screen.getAllByLabelText(/^observation du/i)).toHaveLength(2)
  })

  test('enregistre le texte d’une observation', async () => {
    const user = userEvent.setup()
    afficher()

    await user.type(screen.getByLabelText(/^observation du 25\/11\/2026/i), ' Beau progrès.')
    await waitFor(() => expect(modifierObservation).toHaveBeenCalledWith(
      'o1', expect.stringContaining('Beau progrès.'), '2026-11-25',
    ))
  })

  test('retire une observation', async () => {
    const user = userEvent.setup()
    afficher()

    await user.click(screen.getByRole('button', { name: /retirer l’observation du 25\/11\/2026/i }))
    await waitFor(() => expect(supprimerObservation).toHaveBeenCalledWith('o1'))
    expect(screen.getByText(/rien d’écrit pour l’instant/i)).toBeTruthy()
  })

  test('change d’élève et ne montre que ses observations', async () => {
    const user = userEvent.setup()
    afficher()

    await user.click(screen.getByRole('button', { name: /tom →/i }))
    expect(screen.getByText(/mes observations sur tom/i)).toBeTruthy()
    expect(screen.getByText(/rien d’écrit pour l’instant/i)).toBeTruthy()
  })

  test('remet l’état d’avant quand le serveur refuse', async () => {
    const user = userEvent.setup()
    ;(definirComportement as jest.Mock).mockResolvedValue({
      ok: false, message: 'Le choix n’a pas pu être enregistré.',
    })
    afficher()

    await user.click(screen.getByRole('radio', { name: /lina, semaine 10 : ça va bien/i }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/n’a pas pu être enregistré/i)
    await waitFor(() => expect(screen.getByRole('radio', {
      name: /lina, semaine 10 : à surveiller/i,
    }).getAttribute('aria-checked')).toBe('true'))
  })

  test('la frise dit chaque semaine, y compris celles sans rien', () => {
    afficher()
    const frise = screen.getByText(/la période d’un coup d’œil/i).parentElement!
    expect(within(frise).getByText(/semaine 9 : ça va bien/i)).toBeTruthy()
    expect(within(frise).getByText(/semaine 11 : rien de noté/i)).toBeTruthy()
  })
})
