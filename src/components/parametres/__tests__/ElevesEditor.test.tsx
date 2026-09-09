/**
 * @jest-environment jsdom
 *
 * Le bouton « Classer de A à Z », demandé par Cécile le 9 septembre 2026.
 *
 * Elle a écrit : « Il faudrait pouvoir classer la liste des élèves par ordre
 * alphabétique sans perdre les éléments déjà notés ». Ces tests gardent les
 * deux moitiés de sa phrase : le classement marche, et rien ne se perd.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ElevesEditor from '@/components/parametres/ElevesEditor'
import { updateEleves } from '@/lib/actions/parametres'

jest.mock('@/lib/actions/parametres', () => ({
  updateEleves: jest.fn(async () => undefined),
}))

/** Les prénoms affichés, dans leur ordre à l'écran. */
function prenomsAffiches(): string[] {
  return screen
    .getAllByText(/^[A-Za-zÀ-ÿ' -]+$/, { selector: 'span.rounded-full' })
    .map(n => n.textContent?.replace('×', '').trim() ?? '')
}

beforeEach(() => jest.clearAllMocks())

it('classe la liste affichée par ordre alphabétique', () => {
  render(<ElevesEditor initial={['Zoé', 'Adam', 'Manon']} />)
  fireEvent.click(screen.getByRole('button', { name: /Classer de A à Z/i }))
  expect(prenomsAffiches()).toEqual(['Adam', 'Manon', 'Zoé'])
})

// En français, Émile se range avec les E, pas après Z.
it('range un prénom accentué à sa place française', () => {
  render(<ElevesEditor initial={['Zoé', 'Émile', 'Elodie', 'Adam']} />)
  fireEvent.click(screen.getByRole('button', { name: /Classer de A à Z/i }))
  expect(prenomsAffiches()).toEqual(['Adam', 'Elodie', 'Émile', 'Zoé'])
})

// La moitié de la phrase de Cécile qui compte le plus : rien ne disparaît.
it('ne perd aucun élève en classant', () => {
  const classe = ['Zoé', 'Émile', 'Jean-Baptiste', 'Anna', 'Bob']
  render(<ElevesEditor initial={classe} />)
  fireEvent.click(screen.getByRole('button', { name: /Classer de A à Z/i }))
  expect(prenomsAffiches()).toHaveLength(classe.length)
  expect([...prenomsAffiches()].sort()).toEqual([...classe].sort())
})

// Classer ne doit rien écrire tout seul : elle voit d'abord, elle décide après.
it('ne touche pas à la base tant qu elle n a pas enregistré', () => {
  render(<ElevesEditor initial={['Zoé', 'Adam']} />)
  fireEvent.click(screen.getByRole('button', { name: /Classer de A à Z/i }))
  expect(updateEleves).not.toHaveBeenCalled()
})

it('enregistre bien la liste classée quand elle le demande', async () => {
  render(<ElevesEditor initial={['Zoé', 'Adam', 'Manon']} />)
  fireEvent.click(screen.getByRole('button', { name: /Classer de A à Z/i }))
  fireEvent.click(screen.getByRole('button', { name: /Enregistrer les élèves/i }))
  await waitFor(() => expect(updateEleves).toHaveBeenCalledWith(['Adam', 'Manon', 'Zoé']))
})

// Rien à classer avec un seul élève : le bouton ne doit pas inviter à un geste
// sans effet. Règle d'or du projet, l'écran ne propose jamais une fausse piste.
it('n est pas proposé quand il y a moins de deux élèves', () => {
  render(<ElevesEditor initial={['Adam']} />)
  const bouton = screen.getByRole('button', { name: /Classer de A à Z/i }) as HTMLButtonElement
  expect(bouton.disabled).toBe(true)
})
