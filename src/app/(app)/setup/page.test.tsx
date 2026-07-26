/** @jest-environment jsdom */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SourceProgression } from '@/lib/progression-sources'
import { creerClasse } from '@/lib/actions/setup'
import SetupPage from '@/app/(app)/setup/page'

const mockSourcesPage: SourceProgression[] = [{
  clientId: 'source-francais',
  creeLe: '2026-07-23T08:00:00.000Z',
  nomSource: 'sommaire.pdf',
  matiere: 'Français',
  nomMethode: "Les P'tites Poules",
  typeDocument: 'manuel',
  periodeNumero: null,
  semaines: [{
    numero: 1,
    items: ['Découvrir le son a'],
    pages: '',
    mots_exemple: [],
  }],
  periodes: [],
  empreinteContenu: 'empreinte-francais',
}, {
  clientId: 'source-maths',
  creeLe: '2026-07-23T08:05:00.000Z',
  nomSource: 'maths.pdf',
  matiere: 'Mathématiques',
  nomMethode: 'Maths en CP',
  typeDocument: 'programmation',
  periodeNumero: null,
  semaines: [],
  periodes: [{
    numero: 1,
    domaines: [{
      nom: 'Nombres',
      items: ['Comparer des collections'],
    }],
  }],
  empreinteContenu: 'empreinte-maths',
}]

jest.mock('@/lib/actions/setup', () => ({
  creerClasse: jest.fn(),
}))

jest.mock('@/components/setup/ProgressionsSetup', () => {
  return function ProgressionsSetupMock({
    onContinue,
  }: {
    onContinue: (sources: SourceProgression[]) => void
  }) {
    return (
      <div>
        <button type="button" onClick={() => onContinue([])}>
          Continuer sans source
        </button>
        <button type="button" onClick={() => onContinue(mockSourcesPage)}>
          Continuer avec plusieurs sources
        </button>
      </div>
    )
  }
})

jest.mock('@/components/setup/RentreeDatePicker', () => {
  return function RentreeDatePickerMock({
    onSelect,
  }: {
    onSelect: (date: string, zone: 'A') => void
  }) {
    return (
      <button type="button" onClick={() => onSelect('2026-09-01', 'A')}>
        Valider la rentrée
      </button>
    )
  }
})

jest.mock('@/components/setup/StudentListEditor', () => {
  return function StudentListEditorMock({
    onSelect,
  }: {
    onSelect: (eleves: string[]) => void
  }) {
    return (
      <button type="button" onClick={() => onSelect(['Lina'])}>
        Valider les élèves
      </button>
    )
  }
})

jest.mock('@/components/TimetableGrid', () => {
  return function TimetableGridMock({
    onSave,
    saving,
  }: {
    onSave: (creneaux: Array<{
      jour: string
      heure_debut: string
      heure_fin: string
      matiere: string
      type: 'cours'
    }>) => void
    saving: boolean
  }) {
    return (
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave([{
          jour: 'lundi',
          heure_debut: '08:30',
          heure_fin: '09:15',
          matiere: 'Français',
          type: 'cours',
        }])}
      >
        Finaliser la classe
      </button>
    )
  }
})

jest.mock('@/components/DemoButton', () => {
  return function DemoButtonMock() {
    return null
  }
})

async function allerJusquaLaFinalisation(
  user: ReturnType<typeof userEvent.setup>,
  avecSources: boolean,
) {
  await user.click(screen.getByRole('button', {
    name: avecSources ? 'Continuer avec plusieurs sources' : 'Continuer sans source',
  }))
  await user.click(screen.getByRole('button', { name: 'Valider la rentrée' }))
  await user.click(screen.getByRole('button', { name: 'Valider les élèves' }))
  await user.click(screen.getByRole('button', { name: /^Partir d'une grille vide/ }))
}

describe('page de setup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(creerClasse).mockImplementation(async () => undefined as never)
  })

  test('finalise réellement le parcours avec zéro source', async () => {
    const user = userEvent.setup()
    render(<SetupPage />)

    await allerJusquaLaFinalisation(user, false)
    await user.click(screen.getByRole('button', { name: 'Finaliser la classe' }))

    expect(creerClasse).toHaveBeenCalledWith({
      sourcesProgression: [],
      rentreeDate: '2026-09-01',
      zoneScolaire: 'A',
      eleves: ['Lina'],
      emploiDuTemps: [expect.objectContaining({
        jour: 'lundi',
        matiere: 'Français',
        ordre: 0,
      })],
    })
  })

  test('transmet toutes les sources importées au parcours final', async () => {
    const user = userEvent.setup()
    render(<SetupPage />)

    await allerJusquaLaFinalisation(user, true)
    await user.click(screen.getByRole('button', { name: 'Finaliser la classe' }))

    expect(creerClasse).toHaveBeenCalledWith(expect.objectContaining({
      sourcesProgression: mockSourcesPage,
    }))
  })

  test('affiche l’erreur et réactive la finalisation après un échec', async () => {
    const user = userEvent.setup()
    jest.mocked(creerClasse).mockRejectedValueOnce(new Error('RPC indisponible'))
    render(<SetupPage />)

    await allerJusquaLaFinalisation(user, true)
    await user.click(screen.getByRole('button', { name: 'Finaliser la classe' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La création de ta classe a échoué : RPC indisponible',
    )
    expect(screen.getByRole('button', { name: 'Finaliser la classe' })).toBeEnabled()
  })
})
