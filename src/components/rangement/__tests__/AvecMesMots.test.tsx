/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AvecMesMots from '@/components/rangement/AvecMesMots'
import { demanderRegle } from '@/lib/ia/regle-client'

jest.mock('@/lib/ia/regle-client', () => ({ demanderRegle: jest.fn() }))
const demander = demanderRegle as jest.Mock

function ecrireEtComprendre(phrase: string) {
  fireEvent.change(screen.getByLabelText('Dis-moi où tu la fais'), { target: { value: phrase } })
  fireEvent.click(screen.getByRole('button', { name: 'Comprendre' }))
}

beforeEach(() => jest.clearAllMocks())

it('montre ce qu’elle a compris, et enregistre sur « C’est ça »', async () => {
  demander.mockResolvedValue({ ok: true, reponse: { statut: 'regle', regle: { type: 'Chant', creneau: 'Musique', jour: 'jeudi' } } })
  const onValidee = jest.fn(async () => null)
  render(<AvecMesMots onValidee={onValidee} />)
  ecrireEtComprendre('le chant c’est le jeudi en musique')
  expect(await screen.findByText('J’ai compris : Chant vers Musique, le jeudi.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'C’est ça' }))
  await waitFor(() => expect(onValidee).toHaveBeenCalledWith({ type: 'Chant', creneau: 'Musique', jour: 'jeudi' }))
  expect(await screen.findByText('C’est noté.')).toBeTruthy()
})

it('« Je réexplique » n’enregistre rien', async () => {
  demander.mockResolvedValue({ ok: true, reponse: { statut: 'regle', regle: { type: 'Chant', creneau: 'Musique', jour: null } } })
  const onValidee = jest.fn(async () => null)
  render(<AvecMesMots onValidee={onValidee} />)
  ecrireEtComprendre('le chant en musique')
  fireEvent.click(await screen.findByRole('button', { name: 'Je réexplique' }))
  expect(screen.queryByText(/J’ai compris/)).toBeNull()
  expect(onValidee).not.toHaveBeenCalled()
})

it('case introuvable : le dit, et propose la plus proche', async () => {
  demander.mockResolvedValue({ ok: true, reponse: {
    statut: 'introuvable', type: 'Fluence', demande: 'Soutien le mardi', plusProche: { creneau: 'APC', jour: 'mardi' },
  } })
  render(<AvecMesMots onValidee={jest.fn(async () => null)} />)
  ecrireEtComprendre('la fluence en soutien le mardi')
  expect(await screen.findByText('Je ne trouve pas de case « Soutien le mardi » dans ton emploi du temps.')).toBeTruthy()
  expect(screen.getByText('J’ai compris : Fluence vers APC, le mardi.')).toBeTruthy()
})

it('incompris deux fois : propose de la poser à la main, rien n’est enregistré', async () => {
  demander.mockResolvedValue({ ok: true, reponse: { statut: 'incompris' } })
  const onValidee = jest.fn(async () => null)
  render(<AvecMesMots onValidee={onValidee} />)
  ecrireEtComprendre('bonjour')
  expect(await screen.findByText('Je n’ai pas compris. Redis-le autrement, avec le nom de ta case.')).toBeTruthy()
  ecrireEtComprendre('euh')
  expect(await screen.findByText('Je n’ai pas compris, tu peux la poser à la main dans le cahier journal.')).toBeTruthy()
  expect(onValidee).not.toHaveBeenCalled()
})

it('IA indisponible : son message, jamais bloquée', async () => {
  demander.mockResolvedValue({ ok: false, message: 'Le crédit IA est épuisé.' })
  render(<AvecMesMots onValidee={jest.fn(async () => null)} />)
  ecrireEtComprendre('le chant en musique')
  expect(await screen.findByText('Le crédit IA est épuisé.')).toBeTruthy()
  expect((screen.getByLabelText('Dis-moi où tu la fais') as HTMLTextAreaElement).disabled).toBe(false)
})
