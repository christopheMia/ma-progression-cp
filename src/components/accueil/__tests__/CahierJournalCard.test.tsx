/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import CahierJournalCard from '../CahierJournalCard'

describe('CahierJournalCard', () => {
  test('ne fabrique pas un contenu pour une semaine vide', () => {
    render(
      <CahierJournalCard
        courante={{ id: 's1', numero: 1, libelle: null }}
        suivantes={[{ id: 's2', numero: 2, libelle: null }]}
      />,
    )

    expect(screen.getByText('Semaine 1')).toBeTruthy()
    expect(screen.queryByText(/Révisions/i)).toBeNull()
    expect(screen.queryByText(/Semaine 1 ·/)).toBeNull()
  })

  test('conserve le contenu réellement fourni', () => {
    render(
      <CahierJournalCard
        courante={{ id: 's1', numero: 1, libelle: 'Son a' }}
        suivantes={[]}
      />,
    )

    expect(screen.getByText('Semaine 1 · Son a')).toBeTruthy()
  })
})
