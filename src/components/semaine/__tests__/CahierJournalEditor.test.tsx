/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CahierJournalEditor from '../CahierJournalEditor'
import {
  genererOuChargerJournal,
  sauvegarderJournal,
} from '@/lib/actions/journal'
import type { JourJournal } from '@/types'

jest.mock('@/lib/actions/journal', () => ({
  genererOuChargerJournal: jest.fn(),
  sauvegarderJournal: jest.fn(),
  regenererJournal: jest.fn(),
}))
jest.mock('@/lib/export-word', () => ({
  exporterJournalWord: jest.fn(),
}))
jest.mock('@/lib/print', () => ({
  imprimerElement: jest.fn(),
}))
jest.mock('../GoogleDocsButton', () => function GoogleDocsButtonMock() {
  return null
})

const journal: JourJournal[] = [{
  jour: 'lundi',
  seances: [
    {
      matiere: 'Lecture',
      heure_debut: '08:45',
      heure_fin: '09:15',
      type: 'cours',
      deroulement: 'Son a',
    },
    {
      matiere: 'Mathématiques',
      heure_debut: '09:15',
      heure_fin: '10:00',
      type: 'cours',
      deroulement: 'Nombres jusqu’à 10',
    },
  ],
}]

async function ouvrirJournal() {
  const user = userEvent.setup()
  render(<CahierJournalEditor semaineId="s1" numeroSemaine={3} />)
  await user.click(screen.getByRole('button', { name: /générer le cahier journal/i }))
  await screen.findByText('Son a')
  return user
}

describe('CahierJournalEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(genererOuChargerJournal as jest.Mock).mockResolvedValue(journal)
    ;(sauvegarderJournal as jest.Mock).mockResolvedValue(undefined)
  })

  test('ne propose plus de générer une journée avec l’IA', async () => {
    await ouvrirJournal()

    expect(screen.queryByRole('button', { name: /générer la journée/i })).toBeNull()
  })

  test('modifie une entrée et sauvegarde les autres sans changement', async () => {
    const user = await ouvrirJournal()

    await user.click(screen.getByRole('button', { name: /modifier mathématiques/i }))
    const matiere = screen.getByLabelText('Matière')
    await user.clear(matiere)
    await user.type(matiere, 'Calcul mental')
    const deroulement = screen.getByLabelText('Déroulement')
    await user.clear(deroulement)
    await user.type(deroulement, 'Jeu des compléments à 10')
    await user.click(screen.getByRole('button', { name: /enregistrer les modifications/i }))

    await waitFor(() => expect(sauvegarderJournal).toHaveBeenCalledTimes(1))
    const contenu = (sauvegarderJournal as jest.Mock).mock.calls[0][1] as JourJournal[]
    expect(contenu[0].seances[0]).toEqual(journal[0].seances[0])
    expect(contenu[0].seances[1]).toMatchObject({
      matiere: 'Calcul mental',
      deroulement: 'Jeu des compléments à 10',
    })
  })

  test('demande confirmation puis supprime uniquement l’entrée choisie', async () => {
    const confirmer = jest.spyOn(window, 'confirm').mockReturnValue(true)
    const user = await ouvrirJournal()

    await user.click(screen.getByRole('button', { name: /supprimer lecture/i }))

    expect(confirmer).toHaveBeenCalledWith(expect.stringMatching(/autres entrées seront conservées/i))
    await waitFor(() => expect(sauvegarderJournal).toHaveBeenCalledTimes(1))
    const contenu = (sauvegarderJournal as jest.Mock).mock.calls[0][1] as JourJournal[]
    expect(contenu[0].seances).toEqual([journal[0].seances[1]])
    confirmer.mockRestore()
  })

  test('annule la suppression quand la confirmation est refusée', async () => {
    const confirmer = jest.spyOn(window, 'confirm').mockReturnValue(false)
    const user = await ouvrirJournal()

    await user.click(screen.getByRole('button', { name: /supprimer lecture/i }))

    expect(sauvegarderJournal).not.toHaveBeenCalled()
    expect(screen.getByText('Son a')).toBeTruthy()
    confirmer.mockRestore()
  })
})
