/** @jest-environment jsdom */

import fs from 'node:fs'
import path from 'node:path'
import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SourceProgression } from '@/lib/progression-sources'
import ProgressionsSetup from '@/components/setup/ProgressionsSetup'

const mockSourceGenerale: SourceProgression = {
  clientId: 'source-generale',
  creeLe: '2026-07-23T08:00:00.000Z',
  nomSource: 'sommaire-francais.pdf',
  matiere: 'Français',
  nomMethode: "Les P'tites Poules",
  typeDocument: 'manuel',
  periodeNumero: null,
  semaines: [{
    numero: 1,
    items: ['Découvrir le son a'],
    pages: '4-5',
    mots_exemple: ['ami'],
  }],
  periodes: [],
  empreinteContenu: 'empreinte-generale',
}

const mockSourcePeriode: SourceProgression = {
  clientId: 'source-periode',
  creeLe: '2026-07-23T08:05:00.000Z',
  nomSource: 'planning-p2.pdf',
  matiere: 'français',
  nomMethode: "Les P’tites Poules",
  typeDocument: 'periode',
  periodeNumero: 2,
  semaines: [{
    numero: 1,
    items: ['Lire des phrases'],
    pages: '',
    mots_exemple: [],
  }],
  periodes: [],
  empreinteContenu: 'empreinte-periode',
}

const mockSourceMaths: SourceProgression = {
  clientId: 'source-maths',
  creeLe: '2026-07-23T08:10:00.000Z',
  nomSource: 'programmation-maths.pdf',
  matiere: 'Mathématiques',
  nomMethode: 'Maths en CP',
  typeDocument: 'programmation',
  periodeNumero: null,
  semaines: [],
  periodes: [{
    numero: 1,
    domaines: [{
      nom: 'Nombres et calcul',
      items: ['Comparer des collections'],
    }],
  }],
  // Une empreinte identique reste autorisée dans une autre méthode :
  // l'unicité persistante est portée par méthode.
  empreinteContenu: 'empreinte-generale',
}

jest.mock('@/components/methodes/SourceImporter', () => {
  const React = jest.requireActual<typeof import('react')>('react')

  return function SourceImporterMock({
    onSourceReady,
  }: {
    onSourceReady: (source: SourceProgression) => void
  }) {
    const [ready, setReady] = React.useState(false)

    function ajouter(source: SourceProgression) {
      onSourceReady(source)
      setReady(true)
    }

    if (ready) return <p role="status">Document prêt</p>

    return (
      <div aria-label="Importeur de source simulé">
        <button type="button" onClick={() => ajouter(mockSourceGenerale)}>
          Importer le document général
        </button>
        <button type="button" onClick={() => ajouter(mockSourcePeriode)}>
          Importer le planning de période
        </button>
        <button type="button" onClick={() => ajouter({ ...mockSourceGenerale, clientId: 'doublon' })}>
          Importer le doublon
        </button>
        <button type="button" onClick={() => ajouter(mockSourceMaths)}>
          Importer les mathématiques
        </button>
      </div>
    )
  }
})

describe('ProgressionsSetup', () => {
  test('permet de continuer explicitement sans aucune source', async () => {
    const user = userEvent.setup()
    const onContinue = jest.fn()
    render(<ProgressionsSetup onContinue={onContinue} />)

    await user.click(screen.getByRole('button', {
      name: "Je n'ai encore rien à importer",
    }))

    expect(onContinue).toHaveBeenCalledWith([])
  })

  test("reste sur l'étape après le premier document et propose immédiatement un nouvel import", async () => {
    const user = userEvent.setup()
    const onContinue = jest.fn()
    render(<ProgressionsSetup onContinue={onContinue} />)

    await user.click(screen.getByRole('button', { name: 'Importer le document général' }))

    expect(onContinue).not.toHaveBeenCalled()
    expect(screen.getByText('1 document')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importer le planning de période' })).toBeEnabled()
  })

  test('regroupe plusieurs documents de la même matière et méthode', async () => {
    const user = userEvent.setup()
    render(<ProgressionsSetup onContinue={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Importer le document général' }))
    await user.click(screen.getByRole('button', { name: 'Importer le planning de période' }))

    const cartes = screen.getAllByTestId('methode-progression')
    expect(cartes).toHaveLength(1)
    expect(within(cartes[0]).getByRole('heading', {
      name: "Français, Les P'tites Poules",
    })).toBeInTheDocument()
    expect(within(cartes[0]).getByText('2 documents')).toBeInTheDocument()
    expect(within(cartes[0]).getByText('Sommaire général')).toBeInTheDocument()
    expect(within(cartes[0]).getByText('Planning de période, Période 2')).toBeInTheDocument()
  })

  test('sépare les cartes quand la matière ou la méthode change', async () => {
    const user = userEvent.setup()
    render(<ProgressionsSetup onContinue={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Importer le document général' }))
    await user.click(screen.getByRole('button', { name: 'Importer les mathématiques' }))

    expect(screen.getAllByTestId('methode-progression')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Mathématiques, Maths en CP' })).toBeInTheDocument()
  })

  test('retire un brouillon avec un bouton nommé', async () => {
    const user = userEvent.setup()
    render(<ProgressionsSetup onContinue={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Importer le document général' }))
    await user.click(screen.getByRole('button', { name: 'Importer le planning de période' }))
    await user.click(screen.getByRole('button', { name: 'Retirer planning-p2.pdf' }))

    expect(screen.getByText('1 document')).toBeInTheDocument()
    expect(screen.queryByText('planning-p2.pdf')).not.toBeInTheDocument()
  })

  test('refuse un doublon et affiche un avertissement accessible', async () => {
    const user = userEvent.setup()
    render(<ProgressionsSetup onContinue={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Importer le document général' }))
    await user.click(screen.getByRole('button', { name: 'Importer le doublon' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Ce document est déjà importé.')
    expect(screen.getByText('1 document')).toBeInTheDocument()
  })

  test('continue avec toutes les sources importées uniquement sur action explicite', async () => {
    const user = userEvent.setup()
    const onContinue = jest.fn()
    render(<ProgressionsSetup onContinue={onContinue} />)

    await user.click(screen.getByRole('button', { name: 'Importer le document général' }))
    await user.click(screen.getByRole('button', { name: 'Importer les mathématiques' }))
    await user.click(screen.getByRole('button', { name: 'Continuer avec 2 documents' }))

    expect(onContinue).toHaveBeenCalledTimes(1)
    expect(onContinue.mock.calls[0][0]).toEqual([mockSourceGenerale, mockSourceMaths])
  })

  test('explique la priorité documentaire et garde des cartes adaptées au mobile', () => {
    render(
      <ProgressionsSetup
        initialSources={[mockSourceGenerale, mockSourcePeriode]}
        onContinue={jest.fn()}
      />,
    )

    expect(screen.getByText(/plus précis complète ou remplace seulement la partie concernée/i))
      .toBeInTheDocument()
    const carte = screen.getByTestId('methode-progression')
    expect(carte).toHaveClass('min-w-0')
    expect(within(carte).getByRole('button', {
      name: 'Retirer sommaire-francais.pdf',
    })).toBeVisible()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  test("la page de setup utilise la nouvelle étape à la place du sélecteur historique", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(app)/setup/page.tsx'),
      'utf8',
    )

    expect(source).toContain("import ProgressionsSetup from '@/components/setup/ProgressionsSetup'")
    expect(source).toContain('<ProgressionsSetup')
    expect(source).not.toContain("import ManualSelector from '@/components/setup/ManualSelector'")
  })
})
