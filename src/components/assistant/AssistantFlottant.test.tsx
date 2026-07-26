/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AssistantFlottant from '@/components/assistant/AssistantFlottant'
import { ajouterSourceProgression } from '@/lib/actions/methode-sources'
import type { SourceProgression } from '@/lib/progression-sources'

const refresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

jest.mock('@/lib/actions/methode-sources', () => ({
  ajouterSourceProgression: jest.fn(),
}))

const source: SourceProgression = {
  clientId: 'source-assistant',
  creeLe: '2026-07-23T10:00:00.000Z',
  nomSource: 'assistant.pdf',
  matiere: 'Mathématiques',
  nomMethode: 'Maths CP',
  typeDocument: 'manuel',
  periodeNumero: null,
  semaines: [{ numero: 1, items: ['Comparer'], pages: '', mots_exemple: [] }],
  periodes: [],
  empreinteContenu: 'empreinte-assistant',
}

jest.mock('@/components/methodes/SourceImporter', () => ({
  __esModule: true,
  default: ({
    onSourceReady,
  }: {
    onSourceReady: (source: SourceProgression) => void | Promise<void>
  }) => (
    <button
      type="button"
      onClick={() => {
        void Promise.resolve(onSourceReady(source)).catch(() => undefined)
      }}
    >
      Ajouter depuis l’assistant
    </button>
  ),
}))

describe('AssistantFlottant', () => {
  // Sans ca, un test qui echoue avant son useRealTimers laisse les faux
  // minuteurs actifs et fait echouer les suivants pour une mauvaise raison.
  afterEach(() => {
    jest.useRealTimers()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(ajouterSourceProgression).mockResolvedValue({
      sourceId: 'source-1',
      methodeId: 'm-ma',
    })
  })

  test('un simple clic ouvre le panneau, même avec le bouton déplaçable', () => {
    // Regression du 26/07 : capturer le pointeur des l'appui redirigeait le clic
    // vers le conteneur, le bouton ne le recevait plus, et plus rien ne s'ouvrait.
    render(<AssistantFlottant hasClass />)
    const bouton = screen.getByRole('button', { name: 'Mon assistant' })

    fireEvent.pointerDown(bouton, { pointerId: 1, clientX: 20, clientY: 100, button: 0 })
    fireEvent.pointerUp(bouton, { pointerId: 1, clientX: 20, clientY: 100 })
    fireEvent.click(bouton)

    expect(screen.getByRole('dialog', { name: 'Mon assistant' })).toBeInTheDocument()
  })

  test('la bulle d’accueil se présente, puis se tait une fois l’assistant utilisé', async () => {
    jest.useFakeTimers()
    window.localStorage.clear()
    const { unmount } = render(<AssistantFlottant hasClass />)

    act(() => { jest.advanceTimersByTime(1500) })
    expect(screen.getByText(/ton assistant préféré est là/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Merci, j’ai compris' }))
    expect(screen.queryByText(/ton assistant préféré est là/)).toBeNull()

    // Elle ne revient pas au chargement suivant.
    unmount()
    render(<AssistantFlottant hasClass />)
    act(() => { jest.advanceTimersByTime(1500) })
    expect(screen.queryByText(/ton assistant préféré est là/)).toBeNull()
    jest.useRealTimers()
  })

  test('s’ouvre sur la conversation, pas sur le formulaire d’import', () => {
    render(<AssistantFlottant hasClass prenom="Cécile" />)

    fireEvent.click(screen.getByRole('button', { name: 'Mon assistant' }))

    expect(screen.getByRole('tab', { name: 'Discuter' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Ta question')).toBeInTheDocument()
    expect(screen.getByText(/Bonjour Cécile/)).toBeInTheDocument()
    // Le formulaire d'import ne monopolise plus le panneau.
    expect(screen.queryByRole('button', { name: 'Ajouter depuis l’assistant' })).toBeNull()
  })

  test('ajoute une source persistante sans écrire directement dans progression', async () => {
    render(<AssistantFlottant hasClass />)

    fireEvent.click(screen.getByRole('button', { name: 'Mon assistant' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Ajouter un document' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter depuis l’assistant' }))

    await waitFor(() =>
      expect(ajouterSourceProgression).toHaveBeenCalledWith(source)
    )
    expect(screen.getByRole('status').textContent).toContain('Document ajouté')
  })
})
