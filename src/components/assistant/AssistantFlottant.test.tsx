/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(ajouterSourceProgression).mockResolvedValue({
      sourceId: 'source-1',
      methodeId: 'm-ma',
    })
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
