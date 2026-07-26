/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ChatAssistant from '@/components/assistant/ChatAssistant'

function reponseJson(data: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => data } as Response
}

describe('ChatAssistant', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  test('envoie la question et affiche la réponse de l’assistant', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(
      reponseJson({ reponse: 'Tu démarres par ta date de rentrée.' })
    )
    render(<ChatAssistant prenom="Cécile" rentreeDate="2026-09-01" matieres={['francais']} />)

    fireEvent.change(screen.getByLabelText('Ta question'), {
      target: { value: 'Par où je commence ?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(await screen.findByText('Tu démarres par ta date de rentrée.')).toBeInTheDocument()
    expect(screen.getByText('Par où je commence ?')).toBeInTheDocument()

    const corps = JSON.parse(jest.mocked(fetch).mock.calls[0][1]?.body as string)
    expect(corps).toEqual({
      message: 'Par où je commence ?',
      historique: [],
      prenom: 'Cécile',
      rentree_date: '2026-09-01',
      matieres: ['francais'],
    })
  })

  test('transmet l’historique au second tour, sans le message en cours', async () => {
    jest.mocked(fetch)
      .mockResolvedValueOnce(reponseJson({ reponse: 'Première réponse.' }))
      .mockResolvedValueOnce(reponseJson({ reponse: 'Deuxième réponse.' }))
    render(<ChatAssistant prenom="Cécile" />)

    fireEvent.change(screen.getByLabelText('Ta question'), { target: { value: 'Question 1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await screen.findByText('Première réponse.')

    fireEvent.change(screen.getByLabelText('Ta question'), { target: { value: 'Question 2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await screen.findByText('Deuxième réponse.')

    const corps = JSON.parse(jest.mocked(fetch).mock.calls[1][1]?.body as string)
    expect(corps.message).toBe('Question 2')
    expect(corps.historique).toEqual([
      { role: 'user', content: 'Question 1' },
      { role: 'assistant', content: 'Première réponse.' },
    ])
  })

  test('affiche l’erreur renvoyée par l’API sans perdre la question posée', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(
      reponseJson({ error: 'Le service est momentanément indisponible.' }, false, 503)
    )
    render(<ChatAssistant />)

    fireEvent.change(screen.getByLabelText('Ta question'), { target: { value: 'Une question' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Le service est momentanément indisponible.')
    expect(screen.getByText('Une question')).toBeInTheDocument()
  })

  test('une amorce lance directement la conversation', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson({ reponse: 'Voilà comment faire.' }))
    render(<ChatAssistant />)

    fireEvent.click(screen.getByRole('button', { name: 'Comment je démarre ma progression ?' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const corps = JSON.parse(jest.mocked(fetch).mock.calls[0][1]?.body as string)
    expect(corps.message).toBe('Comment je démarre ma progression ?')
  })
})
