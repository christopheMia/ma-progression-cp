/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ImporterEdtButton from '../ImporterEdtButton'
import { extraireTexteBureautique } from '@/lib/ia/bureautique-client'

jest.mock('@/lib/actions/parametres', () => ({
  updateEmploiDuTemps: jest.fn(),
}))

// Les deux fonctions de tri (`formatBureautique`, `estFormatAncien`) restent
// les vraies : ce sont elles qui choisissent le chemin, les simuler ne testerait
// plus rien.
jest.mock('@/lib/ia/bureautique-client', () => ({
  ...jest.requireActual('@/lib/ia/bureautique-client'),
  extraireTexteBureautique: jest.fn(),
}))

const mockExtraire = jest.mocked(extraireTexteBureautique)

const REPONSE_EDT = {
  creneaux: [
    { jour: 'lundi', heure_debut: '08:20', heure_fin: '08:30', matiere: 'Accueil', type: 'routine' },
    { jour: 'lundi', heure_debut: '08:30', heure_fin: '09:15', matiere: 'Chut je lis', type: 'cours' },
  ],
  correction_matin: null,
}

function reponseJson(data: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => data } as Response
}

function champ() {
  return screen.getByLabelText('Emploi du temps (PDF, Word ou Excel)')
}

function corps(): FormData {
  return jest.mocked(fetch).mock.calls[0][1]?.body as FormData
}

describe('ImporterEdtButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  test('envoie un PDF tel quel : le modèle doit voir la grille', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson(REPONSE_EDT))
    render(<ImporterEdtButton />)
    const pdf = new File(['pdf'], 'edt.pdf', { type: 'application/pdf' })

    fireEvent.change(champ(), { target: { files: [pdf] } })
    await screen.findByText(/2 créneaux/)

    expect(corps().getAll('pdf')).toHaveLength(1)
    expect(corps().get('texte')).toBeNull()
    expect(mockExtraire).not.toHaveBeenCalled()
  })

  test('lit un Word dans le navigateur et n’envoie que son texte', async () => {
    mockExtraire.mockResolvedValueOnce('lundi\tmardi\n08:20 Accueil\t08:20 Accueil')
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson(REPONSE_EDT))
    render(<ImporterEdtButton />)
    const word = new File(['docx'], 'edt.docx')

    fireEvent.change(champ(), { target: { files: [word] } })
    await screen.findByText(/2 créneaux/)

    expect(mockExtraire).toHaveBeenCalledWith(word)
    expect(corps().get('pdf')).toBeNull()
    expect(corps().get('texte')).toBe('lundi\tmardi\n08:20 Accueil\t08:20 Accueil')
  })

  test('lit un Excel par le même chemin texte', async () => {
    mockExtraire.mockResolvedValueOnce('## Semaine type\nlundi\t08:20\tAccueil')
    jest.mocked(fetch).mockResolvedValueOnce(reponseJson(REPONSE_EDT))
    render(<ImporterEdtButton />)

    fireEvent.change(champ(), { target: { files: [new File(['xlsx'], 'edt.xlsx')] } })
    await screen.findByText(/2 créneaux/)

    expect(corps().get('texte')).toBe('## Semaine type\nlundi\t08:20\tAccueil')
  })

  test('guide vers Enregistrer sous quand le fichier est un .xls', async () => {
    render(<ImporterEdtButton />)

    fireEvent.change(champ(), { target: { files: [new File(['xls'], 'edt.xls')] } })

    expect(await screen.findByRole('alert')).toHaveTextContent(/Enregistrer sous/i)
    expect(fetch).not.toHaveBeenCalled()
  })

  test('refuse de mélanger un PDF et un Word dans le même import', async () => {
    render(<ImporterEdtButton />)
    const fichiers = [
      new File(['pdf'], 'edt.pdf', { type: 'application/pdf' }),
      new File(['docx'], 'edt.docx'),
    ]

    fireEvent.change(champ(), { target: { files: fichiers } })

    expect(await screen.findByRole('alert')).toHaveTextContent(/séparément/i)
    expect(fetch).not.toHaveBeenCalled()
  })

  test('affiche le message de lecture sans le préfixer « Erreur réseau »', async () => {
    mockExtraire.mockRejectedValueOnce(
      new Error('« edt.docx » ne contient pas de texte lisible.'),
    )
    render(<ImporterEdtButton />)

    fireEvent.change(champ(), { target: { files: [new File(['docx'], 'edt.docx')] } })

    const alerte = await screen.findByRole('alert')
    expect(alerte).toHaveTextContent(/ne contient pas de texte lisible/i)
    expect(alerte).not.toHaveTextContent(/Erreur réseau/i)
  })

  test('remonte le message d’erreur de la route', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(
      reponseJson({ error: "L'IA n'a reconnu aucun créneau dans ce document." }, false, 422),
    )
    render(<ImporterEdtButton />)

    fireEvent.change(champ(), { target: { files: [new File(['pdf'], 'edt.pdf')] } })

    expect(await screen.findByRole('alert')).toHaveTextContent(/aucun créneau/i)
  })
})
