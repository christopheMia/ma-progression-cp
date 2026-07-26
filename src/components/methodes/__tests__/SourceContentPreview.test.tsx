/**
 * @jest-environment jsdom
 */
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import SourceContentPreview from '../SourceContentPreview'
import type { ProgressionSemaine } from '@/data/manuels'
import type { PeriodeProgrammation } from '@/lib/repartition-periode'

function ApercuSemainesControle() {
  const [semaines, setSemaines] = useState<ProgressionSemaine[]>([{
    numero: 1,
    items: [''],
    pages: '',
    mots_exemple: [''],
  }])
  return (
    <SourceContentPreview
      typeDocument="manuel"
      semaines={semaines}
      periodes={[]}
      onSemainesChange={setSemaines}
      onPeriodesChange={() => {}}
    />
  )
}

function ApercuProgrammationControle() {
  const [periodes, setPeriodes] = useState<PeriodeProgrammation[]>([{
    numero: 1,
    domaines: [{ nom: '', items: [''] }],
  }])
  return (
    <SourceContentPreview
      typeDocument="programmation"
      semaines={[]}
      periodes={periodes}
      onSemainesChange={() => {}}
      onPeriodesChange={setPeriodes}
    />
  )
}

describe('SourceContentPreview', () => {
  test('affiche la date du lundi à côté de chaque semaine', () => {
    render(
      <SourceContentPreview
        typeDocument="manuel"
        semaines={[{ numero: 2, items: ['a'], pages: '', mots_exemple: [] }]}
        periodes={[]}
        datesParNumero={{ 2: '2026-09-07' }}
        onSemainesChange={() => {}}
        onPeriodesChange={() => {}}
      />
    )

    expect(screen.getByText('Semaine du 7 septembre')).toBeInTheDocument()
    expect(screen.getByText('Semaine 2')).toBeInTheDocument()
  })

  test('affiche une semaine vide au lieu de la faire disparaître', () => {
    render(
      <SourceContentPreview
        typeDocument="manuel"
        semaines={[
          { numero: 1, items: [], pages: '', mots_exemple: [] },
          { numero: 2, items: ['a'], pages: '', mots_exemple: [] },
        ]}
        periodes={[]}
        datesParNumero={{ 1: '2026-08-31', 2: '2026-09-07' }}
        onSemainesChange={() => {}}
        onPeriodesChange={() => {}}
      />
    )

    expect(screen.getByText('Semaine du 31 août')).toBeInTheDocument()
    expect(
      screen.getByText('Aucun contenu du document sur cette semaine. Tu pourras la remplir plus tard.')
    ).toBeInTheDocument()
  })

  test('sans dates fournies, garde l’ancien libellé par numéro', () => {
    render(
      <SourceContentPreview
        typeDocument="manuel"
        semaines={[{ numero: 3, items: ['o'], pages: '', mots_exemple: [] }]}
        periodes={[]}
        onSemainesChange={() => {}}
        onPeriodesChange={() => {}}
      />
    )

    expect(screen.getByText('Semaine 3')).toBeInTheDocument()
  })

  test('conserve les espaces pendant la frappe des notions et mots d une semaine', async () => {
    const user = userEvent.setup()
    render(<ApercuSemainesControle />)

    const notions = screen.getByLabelText('Notions de la semaine 1')
    await user.type(notions, 'nombres jusqu’à 10')
    expect(notions).toHaveValue('nombres jusqu’à 10')

    const mots = screen.getByLabelText('Mots exemples de la semaine 1')
    await user.type(mots, 'mots outils')
    expect(mots).toHaveValue('mots outils')
  })

  test('conserve les espaces pendant la frappe du domaine et de ses notions', async () => {
    const user = userEvent.setup()
    render(<ApercuProgrammationControle />)

    const domaine = screen.getByLabelText('Nom du domaine 1 de la période 1')
    await user.type(domaine, 'Nombres et calcul')
    expect(domaine).toHaveValue('Nombres et calcul')

    const notions = screen.getByLabelText('Notions du domaine 1 de la période 1')
    await user.type(notions, 'nombres jusqu’à 10')
    expect(notions).toHaveValue('nombres jusqu’à 10')
  })

  test('modifie une semaine sans muter les props et garde une notion multi-mots par ligne', () => {
    const semaines = [{
      numero: 1,
      items: ['Découvrir le son ou'],
      pages: '10-11',
      mots_exemple: ['loup gris'],
    }]
    const onSemainesChange = jest.fn()

    const { rerender } = render(
      <SourceContentPreview
        typeDocument="manuel"
        semaines={semaines}
        periodes={[]}
        onSemainesChange={onSemainesChange}
        onPeriodesChange={jest.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Notions de la semaine 1'), {
      target: { value: 'Découvrir le son ou\nLire une phrase courte' },
    })

    expect(onSemainesChange).toHaveBeenCalledWith([{
      numero: 1,
      items: ['Découvrir le son ou', 'Lire une phrase courte'],
      pages: '10-11',
      mots_exemple: ['loup gris'],
    }])
    expect(semaines).toEqual([{
      numero: 1,
      items: ['Découvrir le son ou'],
      pages: '10-11',
      mots_exemple: ['loup gris'],
    }])

    const avecNotions = onSemainesChange.mock.calls.at(-1)?.[0]
    rerender(
      <SourceContentPreview
        typeDocument="manuel"
        semaines={avecNotions}
        periodes={[]}
        onSemainesChange={onSemainesChange}
        onPeriodesChange={jest.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('Pages de la semaine 1'), {
      target: { value: '12-13' },
    })
    const avecPages = onSemainesChange.mock.calls.at(-1)?.[0]
    rerender(
      <SourceContentPreview
        typeDocument="manuel"
        semaines={avecPages}
        periodes={[]}
        onSemainesChange={onSemainesChange}
        onPeriodesChange={jest.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('Mots exemples de la semaine 1'), {
      target: { value: 'loup gris\npoule rousse' },
    })

    expect(onSemainesChange).toHaveBeenLastCalledWith([{
      numero: 1,
      items: ['Découvrir le son ou', 'Lire une phrase courte'],
      pages: '12-13',
      mots_exemple: ['loup gris', 'poule rousse'],
    }])
    expect(semaines[0]).toEqual({
      numero: 1,
      items: ['Découvrir le son ou'],
      pages: '10-11',
      mots_exemple: ['loup gris'],
    })
  })

  test('modifie le domaine et ses notions dans une programmation sans muter les props', () => {
    const periodes = [{
      numero: 1,
      domaines: [{
        nom: 'Calcul mental',
        items: ['Ajouter ou soustraire 2'],
      }],
    }]
    const onPeriodesChange = jest.fn()
    const { rerender } = render(
      <SourceContentPreview
        typeDocument="programmation"
        semaines={[]}
        periodes={periodes}
        onSemainesChange={jest.fn()}
        onPeriodesChange={onPeriodesChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Nom du domaine 1 de la période 1'), {
      target: { value: 'Nombres et calcul' },
    })

    expect(onPeriodesChange).toHaveBeenLastCalledWith([{
      numero: 1,
      domaines: [{
        nom: 'Nombres et calcul',
        items: ['Ajouter ou soustraire 2'],
      }],
    }])
    expect(periodes[0].domaines[0].nom).toBe('Calcul mental')

    const periodesModifiees = onPeriodesChange.mock.calls.at(-1)?.[0]
    rerender(
      <SourceContentPreview
        typeDocument="programmation"
        semaines={[]}
        periodes={periodesModifiees}
        onSemainesChange={jest.fn()}
        onPeriodesChange={onPeriodesChange}
      />,
    )
    fireEvent.change(screen.getByLabelText('Notions du domaine 1 de la période 1'), {
      target: { value: 'Ajouter ou soustraire 2\nComparer des collections' },
    })

    expect(onPeriodesChange).toHaveBeenLastCalledWith([{
      numero: 1,
      domaines: [{
        nom: 'Nombres et calcul',
        items: ['Ajouter ou soustraire 2', 'Comparer des collections'],
      }],
    }])
    expect(periodes[0].domaines[0].items).toEqual(['Ajouter ou soustraire 2'])
  })

  test('reste en cartes sans tableau à 375 px', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 375,
    })
    const { container } = render(
      <SourceContentPreview
        typeDocument="periode"
        semaines={[{
          numero: 1,
          items: ['Comparer des collections'],
          pages: '8',
          mots_exemple: [],
        }]}
        periodes={[]}
        onSemainesChange={jest.fn()}
        onPeriodesChange={jest.fn()}
      />,
    )

    expect(container.querySelector('table')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Semaine 1' })).toBeTruthy()
    expect(container.firstElementChild?.className).toContain('grid')
  })

  test('construit une programmation vide sans muter les props', () => {
    const periodes: never[] = []
    const onPeriodesChange = jest.fn()
    const { rerender } = render(
      <SourceContentPreview
        typeDocument="programmation"
        semaines={[]}
        periodes={periodes}
        onSemainesChange={jest.fn()}
        onPeriodesChange={onPeriodesChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une période' }))
    expect(onPeriodesChange).toHaveBeenLastCalledWith([{
      numero: 1,
      domaines: [],
    }])
    expect(periodes).toEqual([])

    const avecPeriode = onPeriodesChange.mock.calls.at(-1)?.[0]
    rerender(
      <SourceContentPreview
        typeDocument="programmation"
        semaines={[]}
        periodes={avecPeriode}
        onSemainesChange={jest.fn()}
        onPeriodesChange={onPeriodesChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', {
      name: 'Ajouter un domaine à la période 1',
    }))
    expect(onPeriodesChange).toHaveBeenLastCalledWith([{
      numero: 1,
      domaines: [{ nom: '', items: [] }],
    }])

    const avecDomaine = onPeriodesChange.mock.calls.at(-1)?.[0]
    rerender(
      <SourceContentPreview
        typeDocument="programmation"
        semaines={[]}
        periodes={avecDomaine}
        onSemainesChange={jest.fn()}
        onPeriodesChange={onPeriodesChange}
      />,
    )
    fireEvent.change(screen.getByLabelText('Nom du domaine 1 de la période 1'), {
      target: { value: 'Nombres et calcul' },
    })
    const avecNom = onPeriodesChange.mock.calls.at(-1)?.[0]
    rerender(
      <SourceContentPreview
        typeDocument="programmation"
        semaines={[]}
        periodes={avecNom}
        onSemainesChange={jest.fn()}
        onPeriodesChange={onPeriodesChange}
      />,
    )
    fireEvent.change(screen.getByLabelText('Notions du domaine 1 de la période 1'), {
      target: { value: 'Comparer deux collections' },
    })

    expect(onPeriodesChange).toHaveBeenLastCalledWith([{
      numero: 1,
      domaines: [{
        nom: 'Nombres et calcul',
        items: ['Comparer deux collections'],
      }],
    }])
  })

  test('ajoute toujours une période libre et ne crée aucun doublon', () => {
    const onPeriodesChange = jest.fn()
    const { rerender } = render(
      <SourceContentPreview
        typeDocument="programmation"
        semaines={[]}
        periodes={[
          { numero: 1, domaines: [] },
          { numero: 2, domaines: [] },
          { numero: 4, domaines: [] },
        ]}
        onSemainesChange={jest.fn()}
        onPeriodesChange={onPeriodesChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une période' }))
    const avecTrois = onPeriodesChange.mock.calls.at(-1)?.[0]
    expect(avecTrois.map((periode: { numero: number }) => periode.numero)).toEqual([1, 2, 4, 3])

    rerender(
      <SourceContentPreview
        typeDocument="programmation"
        semaines={[]}
        periodes={avecTrois}
        onSemainesChange={jest.fn()}
        onPeriodesChange={onPeriodesChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une période' }))
    const cinqPeriodes = onPeriodesChange.mock.calls.at(-1)?.[0]
    expect(cinqPeriodes.map((periode: { numero: number }) => periode.numero)).toEqual([1, 2, 4, 3, 5])

    rerender(
      <SourceContentPreview
        typeDocument="programmation"
        semaines={[]}
        periodes={cinqPeriodes}
        onSemainesChange={jest.fn()}
        onPeriodesChange={onPeriodesChange}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Ajouter une période' })).toBeNull()
  })

  test('construit des semaines vides avec le premier numéro disponible sans mutation', () => {
    const semaines = [{
      numero: 1,
      items: ['Notion existante'],
      pages: '',
      mots_exemple: [],
    }, {
      numero: 3,
      items: [],
      pages: '',
      mots_exemple: [],
    }]
    const onSemainesChange = jest.fn()
    render(
      <SourceContentPreview
        typeDocument="periode"
        semaines={semaines}
        periodes={[]}
        onSemainesChange={onSemainesChange}
        onPeriodesChange={jest.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une semaine' }))
    expect(onSemainesChange).toHaveBeenLastCalledWith([
      semaines[0],
      semaines[1],
      { numero: 2, items: [], pages: '', mots_exemple: [] },
    ])
    expect(semaines).toHaveLength(2)
  })
})
