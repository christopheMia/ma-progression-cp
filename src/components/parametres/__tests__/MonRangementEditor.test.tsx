/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import MonRangementEditor from '@/components/parametres/MonRangementEditor'
import { enregistrerRegle, supprimerRegle } from '@/lib/actions/regles-rangement'
import { demanderRegle } from '@/lib/ia/regle-client'
import type { RegleRangement } from '@/types'

jest.mock('@/lib/actions/regles-rangement', () => ({
  enregistrerRegle: jest.fn(),
  supprimerRegle: jest.fn(async () => ({ ok: true, valeur: undefined })),
}))
jest.mock('@/lib/ia/regle-client', () => ({ demanderRegle: jest.fn() }))

const regle = (id: string, type: string, creneau: string, jour: RegleRangement['jour'] = null): RegleRangement =>
  ({ id, class_id: 'classe', type, type_cle: type.toLowerCase(), creneau, jour, origine: 'main' })
const CASES = [
  { nom: 'APC', jours: ['mardi' as const, 'vendredi' as const] },
  { nom: 'Musique', jours: ['jeudi' as const] },
]

beforeEach(() => jest.clearAllMocks())

it('carnet vide : le dit simplement', () => {
  render(<MonRangementEditor initial={[]} cases={CASES} />)
  expect(screen.getByText('Ton carnet est vide : tout est rangé automatiquement.')).toBeTruthy()
})

it('regroupe sur une ligne les types qui vont dans la même case', () => {
  render(<MonRangementEditor initial={[regle('1', 'Chant', 'Musique', 'jeudi'), regle('2', 'Écoute musicale', 'Musique', 'jeudi')]} cases={CASES} />)
  const ligne = screen.getByText('Chant, Écoute musicale').closest('li')!
  expect(within(ligne).getByText('Musique')).toBeTruthy()
  expect(within(ligne).getByText('le jeudi')).toBeTruthy()
  expect(screen.getByText('Ce qui n’est pas ici est rangé automatiquement.')).toBeTruthy()
})

it('signale en orange une règle dont la case n’existe plus, avec « Corriger »', () => {
  render(<MonRangementEditor initial={[regle('1', 'Chant', 'Éveil musical')]} cases={CASES} />)
  expect(screen.getByText('Cette case n’existe plus dans ton emploi du temps.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Corriger Chant' })).toBeTruthy()
})

it('modifier le jour d’une règle', async () => {
  ;(enregistrerRegle as jest.Mock).mockResolvedValue({ ok: true, valeur: regle('2', 'Fluence', 'APC', 'vendredi') })
  render(<MonRangementEditor initial={[regle('2', 'Fluence', 'APC')]} cases={CASES} />)
  fireEvent.click(screen.getByRole('button', { name: 'Modifier Fluence' }))
  fireEvent.change(screen.getByLabelText('Jour pour Fluence'), { target: { value: 'vendredi' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
  await waitFor(() => expect(enregistrerRegle).toHaveBeenCalledWith({ id: '2', type: 'Fluence', creneau: 'APC', jour: 'vendredi' }))
  expect(await screen.findByText('le vendredi')).toBeTruthy()
})

it('supprimer demande une confirmation', async () => {
  render(<MonRangementEditor initial={[regle('2', 'Fluence', 'APC')]} cases={CASES} />)
  fireEvent.click(screen.getByRole('button', { name: 'Modifier Fluence' }))
  fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
  expect(supprimerRegle).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Oui, supprimer' }))
  await waitFor(() => expect(supprimerRegle).toHaveBeenCalledWith('2'))
  expect(await screen.findByText('Ton carnet est vide : tout est rangé automatiquement.')).toBeTruthy()
})

it('carnet pas encore installé : un message, rien d’autre', () => {
  render(<MonRangementEditor initial={[]} cases={CASES} indisponible />)
  expect(screen.getByText('Le carnet de rangement n’est pas encore activé.')).toBeTruthy()
  expect(screen.queryByText('Ajouter une règle avec mes mots')).toBeNull()
})

it('une case qui existe mais pas ce jour-là : un message propre au jour', () => {
  render(<MonRangementEditor initial={[regle('1', 'Chant', 'Musique', 'lundi')]} cases={CASES} />)
  expect(screen.getByText('Cette case n’existe pas le lundi dans ton emploi du temps.')).toBeTruthy()
  expect(screen.queryByText('Cette case n’existe plus dans ton emploi du temps.')).toBeNull()
})

it('lecture impossible : un autre message, pas « pas encore activé »', () => {
  render(<MonRangementEditor initial={[]} cases={CASES} illisible />)
  expect(screen.getByText('Ton rangement n’a pas pu être lu. Réessaie dans un moment.')).toBeTruthy()
  expect(screen.queryByText('Le carnet de rangement n’est pas encore activé.')).toBeNull()
})

it('les champs d’une règle gardent le texte visible dans leur nom accessible, et sont limités', () => {
  render(<MonRangementEditor initial={[regle('2', 'Fluence', 'APC')]} cases={CASES} />)
  fireEvent.click(screen.getByRole('button', { name: 'Modifier Fluence' }))
  const type = screen.getByRole('textbox', { name: 'Ce que je range pour Fluence' }) as HTMLInputElement
  expect(type.maxLength).toBe(80)
  expect(screen.getByRole('combobox', { name: 'Va dans la case pour Fluence' })).toBeTruthy()
  expect(screen.getByRole('combobox', { name: 'Jour pour Fluence' })).toBeTruthy()
})

it('« Annuler » referme la confirmation de suppression sans rien supprimer', () => {
  render(<MonRangementEditor initial={[regle('2', 'Fluence', 'APC')]} cases={CASES} />)
  fireEvent.click(screen.getByRole('button', { name: 'Modifier Fluence' }))
  fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
  fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
  expect(supprimerRegle).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Oui, supprimer' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Supprimer' })).toBeTruthy()
})

it('« Plus tard » referme le panneau « avec mes mots »', () => {
  render(<MonRangementEditor initial={[]} cases={CASES} />)
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter une règle avec mes mots' }))
  expect(screen.getByLabelText('Dis-moi où tu la fais')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }))
  expect(screen.queryByLabelText('Dis-moi où tu la fais')).toBeNull()
  expect(screen.getByRole('button', { name: 'Ajouter une règle avec mes mots' })).toBeTruthy()
})

it('ajouter avec mes mots : rien n’est enregistré avant « C’est ça », puis la ligne apparaît (origine ia)', async () => {
  ;(demanderRegle as jest.Mock).mockResolvedValue({
    ok: true, reponse: { statut: 'regle', regle: { type: 'Chant', creneau: 'Musique', jour: 'jeudi' } },
  })
  ;(enregistrerRegle as jest.Mock).mockResolvedValue({ ok: true, valeur: regle('9', 'Chant', 'Musique', 'jeudi') })
  render(<MonRangementEditor initial={[]} cases={CASES} />)
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter une règle avec mes mots' }))
  fireEvent.change(screen.getByLabelText('Dis-moi où tu la fais'), { target: { value: 'le chant le jeudi en musique' } })
  fireEvent.click(screen.getByRole('button', { name: 'Comprendre' }))
  expect(await screen.findByText('J’ai compris : Chant vers Musique, le jeudi.')).toBeTruthy()
  expect(enregistrerRegle).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'C’est ça' }))
  await waitFor(() => expect(enregistrerRegle).toHaveBeenCalledWith({ type: 'Chant', creneau: 'Musique', jour: 'jeudi', origine: 'ia' }))
  expect(await screen.findByText('le jeudi')).toBeTruthy()
  expect(screen.getByText('Chant')).toBeTruthy()
})
