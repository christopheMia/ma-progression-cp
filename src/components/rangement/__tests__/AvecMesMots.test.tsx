/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AvecMesMots, { listeJours } from '@/components/rangement/AvecMesMots'
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
    statut: 'introuvable', type: 'Fluence', demande: 'Soutien le mardi', jourAbsent: null,
    plusProche: { creneau: 'APC', jour: 'mardi', jours: ['mardi'] },
  } })
  render(<AvecMesMots onValidee={jest.fn(async () => null)} />)
  ecrireEtComprendre('la fluence en soutien le mardi')
  expect(await screen.findByText('Je ne trouve pas de case « Soutien le mardi » dans ton emploi du temps.')).toBeTruthy()
  expect(screen.getByText('Pour Fluence, la case la plus proche : APC, le mardi. C’est ça ?')).toBeTruthy()
  expect(screen.queryByText(/J’ai compris/)).toBeNull()
})

// Essai réel du 18/10 : « le chant c'est en musique le jeudi », Musique n'existe que le mardi.
it('la case existe mais pas le jour demandé : le dit, et la question nomme le jour proposé', async () => {
  demander.mockResolvedValue({ ok: true, reponse: {
    statut: 'introuvable', type: 'Chant', demande: 'Musique le jeudi', jourAbsent: { creneau: 'Musique', jour: 'jeudi' },
    plusProche: { creneau: 'Musique', jour: null, jours: ['mardi'] },
  } })
  const onValidee = jest.fn(async () => null)
  render(<AvecMesMots onValidee={onValidee} />)
  ecrireEtComprendre('le chant c’est en musique le jeudi')
  expect(await screen.findByText('Il n’y a pas de case « Musique » le jeudi dans ton emploi du temps.')).toBeTruthy()
  expect(screen.getByText('Pour Chant, je te propose Musique, le mardi. C’est ça ?')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'C’est ça' }))
  await waitFor(() => expect(onValidee).toHaveBeenCalledWith({ type: 'Chant', creneau: 'Musique', jour: null }))
})

it('une case proposée sur plusieurs jours les nomme tous', async () => {
  demander.mockResolvedValue({ ok: true, reponse: {
    statut: 'introuvable', type: 'Chant', demande: 'Chorale', jourAbsent: null,
    plusProche: { creneau: 'Musique', jour: null, jours: ['lundi', 'mardi', 'jeudi'] },
  } })
  render(<AvecMesMots onValidee={jest.fn(async () => null)} />)
  ecrireEtComprendre('le chant en chorale')
  expect(await screen.findByText('Pour Chant, la case la plus proche : Musique, le lundi, le mardi ou le jeudi. C’est ça ?')).toBeTruthy()
})

it('listeJours', () => {
  expect(listeJours([])).toBe('')
  expect(listeJours(['mardi'])).toBe('le mardi')
  expect(listeJours(['lundi', 'mardi'])).toBe('le lundi ou le mardi')
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

const SORTIE = 'Je n’ai pas compris, tu peux la poser à la main dans le cahier journal.'

it('« Je réexplique » deux fois de suite offre aussi la sortie à la main', async () => {
  demander.mockResolvedValue({ ok: true, reponse: { statut: 'regle', regle: { type: 'Chant', creneau: 'Musique', jour: null } } })
  render(<AvecMesMots onValidee={jest.fn(async () => null)} />)
  ecrireEtComprendre('le chant en musique')
  fireEvent.click(await screen.findByRole('button', { name: 'Je réexplique' }))
  expect(screen.queryByText(SORTIE)).toBeNull()
  ecrireEtComprendre('le chant en musique encore')
  fireEvent.click(await screen.findByRole('button', { name: 'Je réexplique' }))
  expect(screen.getByText(SORTIE)).toBeTruthy()
})

it('case introuvable sans case proche, deux fois : la sortie à la main', async () => {
  demander.mockResolvedValue({ ok: true, reponse: { statut: 'introuvable', type: 'Fluence', demande: 'Ateliers', jourAbsent: null, plusProche: null } })
  render(<AvecMesMots onValidee={jest.fn(async () => null)} />)
  ecrireEtComprendre('la fluence en ateliers')
  expect(await screen.findByText('Je ne trouve pas de case « Ateliers » dans ton emploi du temps.')).toBeTruthy()
  expect(screen.queryByText(SORTIE)).toBeNull()
  ecrireEtComprendre('la fluence en ateliers svp')
  await waitFor(() => expect(screen.getByText(SORTIE)).toBeTruthy())
})

it('un conseil « incompris » disparaît quand la réponse suivante est comprise', async () => {
  demander.mockResolvedValueOnce({ ok: true, reponse: { statut: 'incompris' } })
  render(<AvecMesMots onValidee={jest.fn(async () => null)} />)
  ecrireEtComprendre('bonjour')
  expect(await screen.findByText(/Redis-le autrement/)).toBeTruthy()
  demander.mockResolvedValueOnce({ ok: true, reponse: { statut: 'regle', regle: { type: 'Chant', creneau: 'Musique', jour: null } } })
  ecrireEtComprendre('le chant en musique')
  expect(await screen.findByText('J’ai compris : Chant vers Musique.')).toBeTruthy()
  expect(screen.queryByText(/Redis-le autrement/)).toBeNull()
})

it('une erreur d’enregistrement s’efface au « C’est ça » suivant', async () => {
  demander.mockResolvedValue({ ok: true, reponse: { statut: 'regle', regle: { type: 'Chant', creneau: 'Musique', jour: null } } })
  const onValidee = jest.fn()
    .mockResolvedValueOnce('La règle n’a pas pu être enregistrée.')
    .mockResolvedValueOnce(null)
  render(<AvecMesMots onValidee={onValidee} />)
  ecrireEtComprendre('le chant en musique')
  fireEvent.click(await screen.findByRole('button', { name: 'C’est ça' }))
  expect(await screen.findByText('La règle n’a pas pu être enregistrée.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'C’est ça' }))
  expect(await screen.findByText('C’est noté.')).toBeTruthy()
  expect(screen.queryByText('La règle n’a pas pu être enregistrée.')).toBeNull()
})

it('les résultats et erreurs sont annoncés (role status), la saisie est limitée à 500 caractères', async () => {
  demander.mockResolvedValue({ ok: false, message: 'Le crédit IA est épuisé.' })
  render(<AvecMesMots onValidee={jest.fn(async () => null)} />)
  expect((screen.getByLabelText('Dis-moi où tu la fais') as HTMLTextAreaElement).maxLength).toBe(500)
  ecrireEtComprendre('le chant en musique')
  const message = await screen.findByText('Le crédit IA est épuisé.')
  expect(message.closest('[role="status"]')).not.toBeNull()
})
