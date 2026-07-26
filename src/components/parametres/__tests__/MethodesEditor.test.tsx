/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import MethodesEditor from '@/components/parametres/MethodesEditor'
import {
  ajouterSourceProgression,
  retirerSourceProgression,
} from '@/lib/actions/methode-sources'
import type { Methode, MethodeSource } from '@/types'
import type { SourceProgression } from '@/lib/progression-sources'

const refresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

jest.mock('@/lib/actions/methode-sources', () => ({
  ajouterSourceProgression: jest.fn(),
  retirerSourceProgression: jest.fn(),
}))

jest.mock('@/lib/actions/methodes', () => ({
  updateSuiviActif: jest.fn(async () => undefined),
  lierCreneaux: jest.fn(async () => undefined),
}))

jest.mock('@/components/parametres/NomMethodeEditor', () => ({
  __esModule: true,
  default: ({ nom }: { nom: string | null }) => <span>{nom}</span>,
}))

const candidate: SourceProgression = {
  clientId: 'candidate',
  creeLe: '2026-07-23T10:00:00.000Z',
  nomSource: 'nouveau.pdf',
  matiere: 'Français',
  nomMethode: 'Lecture CP',
  typeDocument: 'manuel',
  periodeNumero: null,
  semaines: [{ numero: 1, items: ['Son a'], pages: '4', mots_exemple: [] }],
  periodes: [],
  empreinteContenu: 'empreinte-nouvelle',
}

jest.mock('@/components/methodes/SourceImporter', () => ({
  __esModule: true,
  default: ({
    matiereInitiale,
    methodeInitiale,
    onSourceReady,
  }: {
    matiereInitiale?: string
    methodeInitiale?: string
    onSourceReady: (source: SourceProgression) => void | Promise<void>
  }) => (
    <div data-testid="source-importer">
      <span>{matiereInitiale || 'matière libre'}</span>
      <span>{methodeInitiale || 'méthode libre'}</span>
      <button
        type="button"
        onClick={() => {
          void Promise.resolve(onSourceReady(candidate)).catch(() => undefined)
        }}
      >
        Valider la source
      </button>
      <button
        type="button"
        onClick={() => {
          void Promise.resolve(onSourceReady(candidate)).catch(() => undefined)
          void Promise.resolve(onSourceReady(candidate)).catch(() => undefined)
        }}
      >
        Double validation
      </button>
    </div>
  ),
}))

const methode: Methode = {
  id: 'm-fr',
  class_id: 'classe-1',
  matiere: 'francais',
  manuel: 'Lecture CP',
  niveau: null,
  suivi_actif: true,
}

const source: MethodeSource = {
  id: 'source-1',
  methode_id: 'm-fr',
  nom_source: 'manuel.pdf',
  type_document: 'manuel',
  periode_numero: null,
  niveau_precision: 1,
  contenu_structure: {
    semaines: [],
    periodes: [],
  },
  empreinte_contenu: 'empreinte-1',
  created_at: '2026-07-20T10:00:00.000Z',
}

function afficher(
  methodes: Methode[] = [methode],
  sources: MethodeSource[] = [source],
) {
  return render(
    <MethodesEditor
      methodes={methodes}
      sources={sources}
      creneaux={[]}
      resumes={{}}
    />,
  )
}

describe('MethodesEditor avec sources persistantes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(ajouterSourceProgression).mockResolvedValue({
      sourceId: 'source-2',
      methodeId: 'm-fr',
    })
    jest.mocked(retirerSourceProgression).mockResolvedValue(undefined)
  })

  test('guide une classe sans méthode vers l’import direct', () => {
    afficher([], [])

    expect(screen.getByText(/Aucune méthode n’est encore configurée/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', {
      name: 'Ajouter un document ou une méthode',
    }))
    expect(screen.getByTestId('source-importer')).toBeTruthy()
    expect(screen.getByText('matière libre')).toBeTruthy()
  })

  test('liste toutes les sources avec leur type et leur période', () => {
    const periode: MethodeSource = {
      ...source,
      id: 'source-2',
      nom_source: 'planning-p2.pdf',
      type_document: 'periode',
      periode_numero: 2,
      niveau_precision: 3,
      empreinte_contenu: 'empreinte-2',
    }
    afficher([methode], [source, periode])

    expect(screen.getByText('manuel.pdf')).toBeTruthy()
    expect(screen.getByText('Manuel ou sommaire')).toBeTruthy()
    expect(screen.getByText('planning-p2.pdf')).toBeTruthy()
    expect(screen.getByText(/Période 2/)).toBeTruthy()
  })

  test('ajoute avec matière et méthode préremplies sans accepter un double clic', async () => {
    let terminer: (() => void) | undefined
    jest.mocked(ajouterSourceProgression).mockImplementation(
      () => new Promise(resolve => {
        terminer = () => resolve({ sourceId: 'source-2', methodeId: 'm-fr' })
      }),
    )
    afficher()

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un document' }))
    expect(screen.getByText('francais')).toBeTruthy()
    expect(screen.getAllByText('Lecture CP').length).toBeGreaterThanOrEqual(2)
    fireEvent.click(screen.getByRole('button', { name: 'Double validation' }))

    expect(ajouterSourceProgression).toHaveBeenCalledTimes(1)
    terminer?.()
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Document ajouté')
    )
    expect(refresh).toHaveBeenCalled()
  })

  test('demande confirmation avant retrait et affiche le succès', async () => {
    const confirmer = jest.spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    afficher()
    const retirer = screen.getByRole('button', { name: 'Retirer manuel.pdf' })

    fireEvent.click(retirer)
    expect(retirerSourceProgression).not.toHaveBeenCalled()
    fireEvent.click(retirer)

    await waitFor(() =>
      expect(retirerSourceProgression).toHaveBeenCalledWith('source-1')
    )
    expect(screen.getByRole('status').textContent).toContain('Document retiré')
    confirmer.mockRestore()
  })

  test('rend une erreur accessible et réactive le bouton', async () => {
    jest.mocked(retirerSourceProgression).mockRejectedValue(
      new Error('Les documents ont changé'),
    )
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    afficher()
    const retirer = screen.getByRole('button', { name: 'Retirer manuel.pdf' })

    fireEvent.click(retirer)

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'Les documents ont changé',
      )
    )
    expect(retirer.hasAttribute('disabled')).toBe(false)
  })
})
