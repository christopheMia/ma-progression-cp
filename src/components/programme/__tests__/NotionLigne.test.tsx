/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotionLigne from '../NotionLigne'
import {
  compterNotionsSemblables,
  rattacherNotionPartout,
  rattacherNotionsSemblables,
} from '@/lib/actions/mapping'

jest.mock('@/lib/actions/mapping', () => ({
  compterNotionsSemblables: jest.fn(),
  rattacherNotionPartout: jest.fn(),
  rattacherNotionsSemblables: jest.fn(),
}))

const competences = [
  { id: 'c1', domaine: 'Lecture', libelle: 'Identifier des mots de manière aisée' },
  { id: 'c2', domaine: 'Écriture', libelle: 'Copier un texte court' },
]

function afficher(competenceId?: string) {
  render(
    <NotionLigne
      matiere="francais"
      semaines={[3, 12, 20]}
      notion="Lire a"
      competenceId={competenceId}
      competences={competences}
    />,
  )
}

describe('NotionLigne', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(rattacherNotionPartout as jest.Mock).mockResolvedValue({ ok: true, valeur: 3 })
    ;(compterNotionsSemblables as jest.Mock).mockResolvedValue({
      ok: true,
      valeur: { notions: [], tete: 'lire' },
    })
    ;(rattacherNotionsSemblables as jest.Mock).mockResolvedValue({ ok: true, valeur: 0 })
  })

  // Une ligne par NOTION et non par semaine : « Lire a » revient trois fois et
  // c'est la meme competence les trois fois.
  test('dit combien de semaines la notion couvre', () => {
    afficher()
    expect(screen.getByText('3 semaines')).toBeTruthy()
  })

  test('enregistre le choix pour toutes les semaines de la notion', async () => {
    const user = userEvent.setup()
    afficher()

    await user.selectOptions(screen.getByLabelText(/compétence pour lire a/i), 'c1')

    await waitFor(() => expect(rattacherNotionPartout).toHaveBeenCalledWith(
      'francais', 'Lire a', 'c1',
    ))
    expect(await screen.findByText(/posé sur ses 3 semaines/i)).toBeTruthy()
    // Le menu garde le choix sans attendre le serveur : avant, la page se
    // rechargeait entierement, ce qui renvoyait en haut des 36 semaines.
    expect((screen.getByLabelText(/compétence pour lire a/i) as HTMLSelectElement).value).toBe('c1')
    expect(screen.queryByText(/à rattacher/i)).toBeNull()
  })

  // Demande de Christophe : les quatorze « Lire ... » d'une methode de lecture
  // vont sur la meme competence et se rattachaient une par une.
  test('propose de rattacher aussi les notions qui se ressemblent', async () => {
    const user = userEvent.setup()
    ;(compterNotionsSemblables as jest.Mock).mockResolvedValue({
      ok: true,
      valeur: { notions: ['Lire i', 'Lire ch', 'Lire ou', 'Lire on'], tete: 'lire' },
    })
    ;(rattacherNotionsSemblables as jest.Mock).mockResolvedValue({ ok: true, valeur: 4 })
    afficher()

    await user.selectOptions(screen.getByLabelText(/compétence pour lire a/i), 'c1')

    expect(await screen.findByText(/4 autres notions se ressemblent/i)).toBeTruthy()
    // Elle voit lesquelles avant de dire oui.
    expect(screen.getByText(/lire i, lire ch, lire ou/i)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /rattacher aussi celles-là/i }))

    await waitFor(() => expect(rattacherNotionsSemblables).toHaveBeenCalledWith(
      'francais', 'Lire a', 'c1',
    ))
    expect(await screen.findByText(/4 notions semblables rattachées aussi/i)).toBeTruthy()
  })

  test('ne propose rien quand aucune notion ne ressemble', async () => {
    const user = userEvent.setup()
    afficher()

    await user.selectOptions(screen.getByLabelText(/compétence pour lire a/i), 'c1')

    await waitFor(() => expect(compterNotionsSemblables).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /rattacher aussi/i })).toBeNull()
  })

  test('laisse refuser la proposition sans rien changer', async () => {
    const user = userEvent.setup()
    ;(compterNotionsSemblables as jest.Mock).mockResolvedValue({
      ok: true,
      valeur: { notions: ['Lire i'], tete: 'lire' },
    })
    afficher()

    await user.selectOptions(screen.getByLabelText(/compétence pour lire a/i), 'c1')
    await user.click(await screen.findByRole('button', { name: /non merci/i }))

    expect(screen.queryByRole('button', { name: /rattacher aussi/i })).toBeNull()
    expect(rattacherNotionsSemblables).not.toHaveBeenCalled()
  })

  // Piege du 27/07 : une action serveur RENVOIE son message, elle ne le leve
  // pas, sinon Next.js l'efface en production.
  test('remet le choix précédent quand le serveur refuse', async () => {
    const user = userEvent.setup()
    ;(rattacherNotionPartout as jest.Mock).mockResolvedValue({
      ok: false,
      message: 'Le rattachement n’a pas pu être enregistré.',
    })
    afficher('c2')

    await user.selectOptions(screen.getByLabelText(/compétence pour lire a/i), 'c1')

    expect((await screen.findByRole('alert')).textContent)
      .toMatch(/n’a pas pu être enregistré/i)
    await waitFor(() => expect(
      (screen.getByLabelText(/compétence pour lire a/i) as HTMLSelectElement).value,
    ).toBe('c2'))
  })
})
